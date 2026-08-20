import { getDashboard } from "@/api/dashboard";
import { listClients } from "@/api/clients";
import { listApprovalQueue, listLoans } from "@/api/loans";
import { listPayments } from "@/api/payments";
import { getClientSavings, getOperationalSavings } from "@/api/savings";
import { listSponsors } from "@/api/sponsors";
import { listStaff } from "@/api/staff";

export { authApi } from "@/api/auth";
export { getDashboard } from "@/api/dashboard";
export { listClients } from "@/api/clients";
export { listApprovalQueue, listLoans } from "@/api/loans";
export { listPayments } from "@/api/payments";
export { getClientSavings, getOperationalSavings } from "@/api/savings";
export { listSponsors } from "@/api/sponsors";
export { listStaff } from "@/api/staff";

export const mobileApi = {
  dashboard: getDashboard,
  sponsors: listSponsors,
  clients: listClients,
  staff: listStaff,
  loans: listLoans,
  approvalQueue: listApprovalQueue,
  payments: listPayments,
  clientSavings: getClientSavings,
  operationalSavings: getOperationalSavings
};
