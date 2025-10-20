import AddressManager from "./sections/AddressManager";

export default function AccountManagementPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Account Management</h1>
        <p className="text-sm text-gray-600">
          Update saved addresses for your organization. Changes apply to all
          portal users tied to this customer account.
        </p>
      </header>

      <section className="max-w-2xl">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <AddressManager />
        </div>
      </section>
    </main>
  );
}
