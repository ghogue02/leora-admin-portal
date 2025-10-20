export type AddressSerializable = {
  id: string;
  label: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: Date;
};

export function serializeAddress(address: AddressSerializable) {
  return {
    id: address.id,
    label: address.label,
    street1: address.street1,
    street2: address.street2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
  };
}
