export type RoomType = 'single' | 'double' | 'suite' | 'deluxe' | 'presidential';
export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type HotelPaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer';
export type StaffRole = 'manager' | 'receptionist' | 'housekeeping' | 'security' | 'maintenance' | 'waiter';
export type HousekeepingStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

export interface HotelInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  tax_rate: number;
  cancellation_policy: string | null;
  created_at: string;
  updated_at: string;
}

export interface HotelRoom {
  id: string;
  room_number: string;
  floor: number;
  room_type: RoomType;
  status: RoomStatus;
  price_per_night: number;
  capacity: number;
  amenities: string[];
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface HotelGuest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  id_proof_type: string | null;
  id_proof_number: string | null;
  id_proof_url: string | null;
  address: string | null;
  nationality: string;
  loyalty_points: number;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface HotelBooking {
  id: string;
  booking_reference: string;
  guest_id: string | null;
  room_id: string | null;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  status: BookingStatus;
  special_requests: string | null;
  total_amount: number;
  paid_amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  guest?: HotelGuest;
  room?: HotelRoom;
}

export interface HotelStaff {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  shift: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  pin: string | null;
  allowed_hotel_routes: string[];
  created_at: string;
  updated_at: string;
}

export interface HotelStaffAttendance {
  id: string;
  staff_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  staff?: HotelStaff;
}

export interface HotelHousekeeping {
  id: string;
  room_id: string;
  assigned_to: string | null;
  task_type: string;
  status: HousekeepingStatus;
  priority: string;
  scheduled_date: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  room?: HotelRoom;
  staff?: HotelStaff;
}

export interface HotelInvoice {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  guest_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: HotelPaymentMethod | null;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  booking?: HotelBooking;
  guest?: HotelGuest;
}

export interface HotelInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: string;
  created_at: string;
}

export interface HotelGuestFeedback {
  id: string;
  guest_id: string | null;
  booking_id: string | null;
  rating: number;
  cleanliness_rating: number;
  service_rating: number;
  amenities_rating: number;
  comments: string | null;
  created_at: string;
  guest?: HotelGuest;
}

export interface HotelPricingRule {
  id: string;
  name: string;
  room_type: RoomType | null;
  start_date: string | null;
  end_date: string | null;
  price_modifier: number;
  is_active: boolean;
  created_at: string;
}
