export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  bio?: string | null;
  role: string;
  account_type: "staff" | "client" | "sponsor" | "guest" | string;
  staff_role: string;
  client_id?: number | null;
  sponsor_id?: number | null;
};

export type Tokens = { access: string; refresh: string };
export type AuthResponse = { access: string; refresh: string; user: User };

export type Dashboard = {
  account_type?: string;
  sponsors?: number;
  clients?: number;
  staff?: number;
  children?: Record<string, number>;
  staff_workforce?: Record<string, number>;
  loans?: Record<string, number>;
  payments?: Record<string, number>;
  savings_balance?: string | number;
};

export type Sponsor = {
  id: number;
  prefixed_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_telephone?: string;
  sponsorship_type?: string;
  current_picture_url?: string | null;
  picture_url?: string | null;
  photo_url?: string | null;
  thumbnail_url?: string | null;
  is_child_sponsor: boolean;
  is_staff_sponsor: boolean;
  is_family_supporter: boolean;
  is_general_donor: boolean;
  is_one_time_donor: boolean;
  is_departed?: boolean;
};

export type Client = {
  id: number;
  prefixed_id: string;
  reg_number: string;
  full_name: string;
  email: string;
  mobile_telephone?: string;
  current_picture_url?: string | null;
  picture_url?: string | null;
  photo_url?: string | null;
  thumbnail_url?: string | null;
  active_loans_count: number;
  savings_balance: string;
};

export type Child = {
  id: number;
  prefixed_id: string;
  full_name: string;
  preferred_name?: string | null;
  gender: string;
  date_of_birth?: string | null;
  registration_date?: string | null;
  residence?: string | null;
  district?: string | null;
  tribe?: string | null;
  aspiration?: string | null;
  c_interest?: string | null;
  is_child_in_school?: boolean;
  guardian?: string | null;
  guardian_contact?: string | null;
  relationship_with_guardian?: string | null;
  health_status?: string | null;
  is_sponsored: boolean;
  is_departed: boolean;
  current_picture_url?: string | null;
};

export type ChildPhotoUpload = {
  id: number;
  child: number;
  picture: string;
  picture_url?: string | null;
  uploaded_at: string;
  is_current: boolean;
};

export type Staff = {
  id: number;
  prefixed_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_telephone?: string;
  job_title?: string;
  date_of_birth?: string | null;
  date_started_work?: string | null;
  departure_date?: string | null;
  department?: string | null;
  gender?: string | null;
  current_picture_url?: string | null;
  picture_url?: string | null;
  photo_url?: string | null;
  thumbnail_url?: string | null;
  is_sponsored?: boolean;
  is_departed?: boolean;
};

export type SponsorRelatedPayment = {
  id: number;
  sponsor: number;
  sponsor_name: string;
  child_name?: string | null;
  staff_name?: string | null;
  amount: string;
  payment_date: string;
  month?: string | number | null;
  payment_year?: string | number | null;
  is_valid?: boolean;
};

export type Loan = {
  id: number;
  borrower: number;
  borrower_name: string;
  borrower_reg_number: string;
  principal_amount: string;
  interest_rate: string;
  interest_method?: string | null;
  interest_rate_method?: string | null;
  total_interest: string;
  total_repayable: string;
  monthly_installment: string;
  total_outstanding?: string | null;
  loan_period_months: number;
  start_date: string;
  disbursement_date?: string | null;
  due_date?: string | null;
  status: string;
  loan_purpose?: string;
  reason_for_rejection?: string | null;
  reason_for_approval?: string | null;
  documents?: LoanDocument[];
  missing_required_documents?: { type: string; label: string }[];
  can_approve?: boolean;
  can_reject?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
  can_disburse?: boolean;
  repayment_schedule?: LoanRepaymentScheduleItem[];
};

export type LoanRepaymentScheduleItem = {
  installment_number?: number;
  number?: number;
  due_date: string;
  principal?: string;
  interest?: string;
  amount?: string;
  total_due?: string;
  status?: string;
};

export type LoanDocument = {
  id: number;
  loan: number;
  document_type: string;
  document_type_label: string;
  description?: string;
  file_url?: string | null;
  created_at: string;
};

export type LoanApplicationPayload = {
  principal_amount: string;
  loan_purpose: string;
  loan_period_months: string;
  start_date?: string;
  interest_rate?: string;
  reason_for_approval?: string;
  national_id?: { uri: string; fileName?: string | null; mimeType?: string | null } | null;
  bank_statement?: { uri: string; fileName?: string | null; mimeType?: string | null } | null;
};

export type SavingsAccount = {
  id: number;
  client: number;
  client_name: string;
  account_number: string;
  opening_date: string;
  status: string;
  balance: string;
};

export type SavingsTransaction = {
  id: number;
  account: number;
  account_number: string;
  client_name: string;
  transaction_type: string;
  amount: string;
  transaction_date: string;
  payment_method?: string | null;
  status: string;
};

export type ClientSavings = {
  accounts: SavingsAccount[];
  transactions: SavingsTransaction[];
};

export type Payment = {
  id: number;
  sponsor: number;
  sponsor_name: string;
  sponsor_code: string;
  program_name: string;
  child_name?: string | null;
  staff_name?: string | null;
  amount: string;
  payment_date: string;
  reference?: string | null;
  notes?: string | null;
};

export type SponsorPayments = {
  child_payments: SponsorRelatedPayment[];
  staff_payments: SponsorRelatedPayment[];
  sponsor_payments: Payment[];
};

export type Paginated<T> = { count: number; next?: string | null; previous?: string | null; results: T[] };
