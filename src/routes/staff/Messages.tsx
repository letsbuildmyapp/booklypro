import CustomerMessages from "@/routes/customer/Messages";

export default function StaffMessages() {
  // Same UI; the underlying conversation data is filtered to participants the staff is in.
  return <CustomerMessages />;
}
