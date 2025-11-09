const GOOGLE_PLACES_FIND_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json";
const GOOGLE_PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";
const GOOGLE_PLACES_AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";

export type GooglePlaceSuggestion = {
  name: string | null;
  formattedAddress: string | null;
  phoneNumber: string | null;
  internationalPhoneNumber: string | null;
  website: string | null;
  location?: { lat: number; lng: number } | null;
  address?: {
    street1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  placeId?: string | null;
  googleMapsUrl?: string | null;
  businessStatus?: string | null;
  types?: string[] | null;
};

export type GooglePlacePrediction = {
  placeId: string;
  description: string;
  primaryText: string;
  secondaryText: string;
};

type FindPlaceResponse = {
  candidates?: Array<{
    place_id?: string;
    formatted_address?: string;
    name?: string;
  }>;
  status: string;
};

type PlaceDetailsResponse = {
  result?: {
    name?: string;
    place_id?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
    business_status?: string;
    types?: string[];
    url?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  };
  status: string;
};

type AutocompleteResponse = {
  predictions?: Array<{
    place_id?: string;
    description?: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
  status: string;
};

export async function fetchGooglePlacePredictions(input: string): Promise<GooglePlacePrediction[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    input,
    types: "establishment",
    components: "country:us",
    key: apiKey,
  });

  const response = await fetch(`${GOOGLE_PLACES_AUTOCOMPLETE_URL}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google Place predictions");
  }

  const data = (await response.json()) as AutocompleteResponse;
  if (data.status !== "OK" || !data.predictions?.length) {
    return [];
  }

  return data.predictions
    .map((prediction) => ({
      placeId: prediction.place_id ?? "",
      description: prediction.description ?? "",
      primaryText: prediction.structured_formatting?.main_text ?? prediction.description ?? "",
      secondaryText: prediction.structured_formatting?.secondary_text ?? "",
    }))
    .filter((prediction) => prediction.placeId && prediction.description);
}

type GooglePlaceDetailsOptions = {
  query?: string;
  placeId?: string;
};

export async function fetchGooglePlaceDetails(options: GooglePlaceDetailsOptions) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const resolvedPlaceId = options.placeId ?? (options.query ? await findPlaceId(options.query, apiKey) : null);
  if (!resolvedPlaceId) {
    return null;
  }

  const detailsParams = new URLSearchParams({
    place_id: resolvedPlaceId,
    fields: [
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "website",
      "geometry",
      "address_components",
      "business_status",
      "types",
      "url",
    ].join(","),
    key: apiKey,
  });

  const detailsResponse = await fetch(`${GOOGLE_PLACES_DETAILS_URL}?${detailsParams.toString()}`, {
    cache: "no-store",
  });

  if (!detailsResponse.ok) {
    throw new Error("Failed to fetch Google Place details");
  }

  const detailsData = (await detailsResponse.json()) as PlaceDetailsResponse;
  if (detailsData.status !== "OK" || !detailsData.result) {
    return null;
  }

  const result = detailsData.result;
  const parsedAddress = extractAddress(result.address_components ?? []);
  const placeId = result.place_id ?? resolvedPlaceId ?? null;
  const googleMapsUrl =
    result.url ?? (placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null);
  return {
    name: result.name ?? null,
    placeId,
    formattedAddress: result.formatted_address ?? null,
    phoneNumber: result.formatted_phone_number ?? null,
    internationalPhoneNumber: result.international_phone_number ?? null,
    website: result.website ?? null,
    googleMapsUrl,
    businessStatus: result.business_status ?? null,
    types: result.types ?? null,
    address: parsedAddress,
    location: result.geometry?.location?.lat && result.geometry?.location?.lng
      ? {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        }
      : null,
  } satisfies GooglePlaceSuggestion;
}

async function findPlaceId(query: string, apiKey: string) {
  const findParams = new URLSearchParams({
    input: query,
    inputtype: "textquery",
    fields: "place_id,formatted_address,name",
    key: apiKey,
  });

  const findResponse = await fetch(`${GOOGLE_PLACES_FIND_URL}?${findParams.toString()}`, {
    cache: "no-store",
  });

  if (!findResponse.ok) {
    throw new Error("Failed to query Google Places");
  }

  const findData = (await findResponse.json()) as FindPlaceResponse;
  if (findData.status !== "OK" || !findData.candidates?.length) {
    return null;
  }

  return findData.candidates[0].place_id ?? null;
}

function extractAddress(
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }>
) {
  if (!components.length) {
    return null;
  }

  const findComponent = (types: string[], useShortName = false) => {
    const match = components.find((component) =>
      component.types?.some((type) => types.includes(type))
    );
    if (!match) return null;
    const value = useShortName ? match.short_name ?? match.long_name : match.long_name ?? match.short_name;
    return value ?? null;
  };

  const streetNumber = findComponent(["street_number"]);
  const route = findComponent(["route"]);
  const locality =
    findComponent(["locality"]) ??
    findComponent(["postal_town"]) ??
    findComponent(["sublocality", "sublocality_level_1"]) ??
    findComponent(["administrative_area_level_2"]);
  const state = findComponent(["administrative_area_level_1"], true);
  const postalCode = findComponent(["postal_code"]);
  const country = findComponent(["country"], true);

  const streetParts = [streetNumber, route].filter(Boolean);
  const street1 = streetParts.length ? streetParts.join(" ") : null;

  if (!street1 && !locality && !state && !postalCode && !country) {
    return null;
  }

  return {
    street1,
    city: locality,
    state,
    postalCode,
    country,
  };
}
