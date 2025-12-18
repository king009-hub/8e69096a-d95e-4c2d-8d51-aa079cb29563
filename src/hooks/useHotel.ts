import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  HotelRoom, HotelGuest, HotelBooking, HotelStaff, 
  HotelHousekeeping, HotelInvoice, HotelInfo, HotelGuestFeedback,
  RoomStatus, BookingStatus, HousekeepingStatus
} from '@/types/hotel';
import { toast } from 'sonner';

// Hotel Info
export function useHotelInfo() {
  return useQuery({
    queryKey: ['hotel-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_info')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as HotelInfo | null;
    }
  });
}

export function useUpdateHotelInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...info }: Partial<HotelInfo> & { id: string }) => {
      const { data, error } = await supabase
        .from('hotel_info')
        .update(info)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-info'] });
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

// Rooms
export function useHotelRooms() {
  return useQuery({
    queryKey: ['hotel-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_rooms')
        .select('*')
        .order('room_number');
      if (error) throw error;
      return (data || []).map(room => ({
        ...room,
        amenities: Array.isArray(room.amenities) ? room.amenities : JSON.parse(room.amenities as string || '[]')
      })) as HotelRoom[];
    }
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (room: Omit<Partial<HotelRoom>, 'id' | 'created_at' | 'updated_at'> & { room_number: string }) => {
      const { data, error } = await supabase
        .from('hotel_rooms')
        .insert([room as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Room created successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...room }: Partial<HotelRoom> & { id: string }) => {
      const { data, error } = await supabase
        .from('hotel_rooms')
        .update(room)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Room updated successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useUpdateRoomStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RoomStatus }) => {
      const { error } = await supabase
        .from('hotel_rooms')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Room status updated');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hotel_rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Room deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

// Guests
export function useHotelGuests() {
  return useQuery({
    queryKey: ['hotel-guests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_guests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HotelGuest[];
    }
  });
}

export function useCreateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guest: { first_name: string; last_name: string; phone: string } & Partial<Omit<HotelGuest, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('hotel_guests')
        .insert([guest as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-guests'] });
      toast.success('Guest created successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useUpdateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...guest }: Partial<HotelGuest> & { id: string }) => {
      const { data, error } = await supabase
        .from('hotel_guests')
        .update(guest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-guests'] });
      toast.success('Guest updated successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

// Bookings
export function useHotelBookings() {
  return useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select(`
          *,
          guest:hotel_guests(*),
          room:hotel_rooms(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(booking => ({
        ...booking,
        room: booking.room ? {
          ...booking.room,
          amenities: Array.isArray(booking.room.amenities) 
            ? booking.room.amenities 
            : JSON.parse(booking.room.amenities as string || '[]')
        } : null
      })) as HotelBooking[];
    }
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (booking: { check_in_date: string; check_out_date: string } & Partial<Omit<HotelBooking, 'id' | 'created_at' | 'updated_at' | 'booking_reference'>>) => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .insert([{ ...booking, booking_reference: '' } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Booking created successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...booking }: Partial<HotelBooking> & { id: string }) => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .update(booking)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Booking updated successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, roomStatus }: { id: string; status: BookingStatus; roomStatus?: RoomStatus }) => {
      const { data: booking, error: bookingError } = await supabase
        .from('hotel_bookings')
        .update({ status })
        .eq('id', id)
        .select('room_id')
        .single();
      if (bookingError) throw bookingError;
      
      if (roomStatus && booking?.room_id) {
        const { error: roomError } = await supabase
          .from('hotel_rooms')
          .update({ status: roomStatus })
          .eq('id', booking.room_id);
        if (roomError) throw roomError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Booking status updated');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

// Staff
export function useHotelStaff() {
  return useQuery({
    queryKey: ['hotel-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_staff')
        .select('*')
        .order('first_name');
      if (error) throw error;
      return data as HotelStaff[];
    }
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staff: { first_name: string; last_name: string } & Partial<Omit<HotelStaff, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('hotel_staff')
        .insert([staff as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-staff'] });
      toast.success('Staff member added successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...staff }: Partial<HotelStaff> & { id: string }) => {
      const { data, error } = await supabase
        .from('hotel_staff')
        .update(staff)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-staff'] });
      toast.success('Staff member updated successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

// Housekeeping
export function useHotelHousekeeping() {
  return useQuery({
    queryKey: ['hotel-housekeeping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_housekeeping')
        .select(`
          *,
          room:hotel_rooms(*),
          staff:hotel_staff(*)
        `)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data as HotelHousekeeping[];
    }
  });
}

export function useCreateHousekeepingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Partial<HotelHousekeeping>) => {
      const { data, error } = await supabase
        .from('hotel_housekeeping')
        .insert([task])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useUpdateHousekeepingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...task }: Partial<HotelHousekeeping> & { id: string }) => {
      const { data, error } = await supabase
        .from('hotel_housekeeping')
        .update(task)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

// Invoices
export function useHotelInvoices() {
  return useQuery({
    queryKey: ['hotel-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_invoices')
        .select(`
          *,
          guest:hotel_guests(*),
          booking:hotel_bookings(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HotelInvoice[];
    }
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Partial<HotelInvoice>) => {
      const { data, error } = await supabase
        .from('hotel_invoices')
        .insert([{ ...invoice, invoice_number: '' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-invoices'] });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

// Feedback
export function useHotelFeedback() {
  return useQuery({
    queryKey: ['hotel-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_guest_feedback')
        .select(`
          *,
          guest:hotel_guests(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HotelGuestFeedback[];
    }
  });
}

// Dashboard Analytics
export function useHotelDashboard() {
  return useQuery({
    queryKey: ['hotel-dashboard'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [roomsRes, bookingsRes, guestsRes] = await Promise.all([
        supabase.from('hotel_rooms').select('*'),
        supabase.from('hotel_bookings').select('*'),
        supabase.from('hotel_guests').select('*')
      ]);

      const rooms = (roomsRes.data || []) as HotelRoom[];
      const bookings = (bookingsRes.data || []) as HotelBooking[];

      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      const todayCheckIns = bookings.filter(b => b.check_in_date === today && b.status !== 'cancelled').length;
      const todayCheckOuts = bookings.filter(b => b.check_out_date === today && b.status === 'checked_in').length;

      const totalRevenue = bookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + Number(b.paid_amount || 0), 0);

      const recentBookings = bookings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Revenue by day for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const revenueByDay = last7Days.map(date => {
        const dayRevenue = bookings
          .filter(b => b.created_at.startsWith(date) && b.status !== 'cancelled')
          .reduce((sum, b) => sum + Number(b.paid_amount || 0), 0);
        return { date, revenue: dayRevenue };
      });

      return {
        totalRooms,
        occupiedRooms,
        occupancyRate,
        todayCheckIns,
        todayCheckOuts,
        totalRevenue,
        totalGuests: guestsRes.data?.length || 0,
        recentBookings,
        revenueByDay,
        roomsByStatus: {
          available: rooms.filter(r => r.status === 'available').length,
          occupied: occupiedRooms,
          reserved: rooms.filter(r => r.status === 'reserved').length,
          maintenance: rooms.filter(r => r.status === 'maintenance').length,
          cleaning: rooms.filter(r => r.status === 'cleaning').length,
        }
      };
    }
  });
}
