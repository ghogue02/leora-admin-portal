# Adding Sales Reps (e.g., Mike Allen)

Use this playbook whenever you need to onboard a new salesperson and make them available in the order-entry experience.

1. **Create the user account (if they don’t already have portal access)**
   - Navigate to `/admin/accounts/users`.
   - Create the user with their email, full name (e.g., “Mike Allen”), and a temporary password.
   - Keep the account active.

2. **Create the sales-rep profile**
   - Go to `/admin/sales-reps/new`.
   - Select the newly created user, fill in the territory details, and set any quotas.
   - Check **“Enable for direct order entry”** to expose this rep in the Sales ➜ Orders ➜ New Order salesperson selector.
     - This is the switch that adds Mike Allen (or any new rep) to the dropdown that sales reps use when logging orders.
   - Save the profile.

3. **(Optional) Update existing reps**
   - Visit `/admin/sales-reps/<repId>` to edit a rep.
   - Toggle **Enable for Order Entry** if you need to add/remove them from the dropdown later.

Once these steps are complete, the rep will appear in the salesperson list on the New Order page and can be assigned to customer orders immediately.***
