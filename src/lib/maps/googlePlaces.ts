const GOOGLE_PLACES_FIND_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json";
const GOOGLE_PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

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
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  };
  status: string;
};

export async function fetchGooglePlaceSuggestion(query: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

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

  const placeId = findData.candidates[0].place_id;
  if (!placeId) {
    return null;
  }

  const detailsParams = new URLSearchParams({
    place_id: placeId,
    fields: [
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "website",
      "geometry",
      "address_components",
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
  return {
    name: result.name ?? null,
    formattedAddress: result.formatted_address ?? null,
    phoneNumber: result.formatted_phone_number ?? null,
    internationalPhoneNumber: result.international_phone_number ?? null,
    website: result.website ?? null,
    address: parsedAddress,
    location: result.geometry?.location?.lat && result.geometry?.location?.lng
      ? {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        }
      : null,
  } satisfies GooglePlaceSuggestion;
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
