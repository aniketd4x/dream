// src/pages/customer/RoomServiceLandingPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  BellRing,
  Sparkles,
  Droplets,
  Shirt,
  Wrench,
  Car,
  AlarmClock,
  Receipt,
  PhoneCall,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Send,
  Bed,
  ArrowRight,
} from 'lucide-react';
import { getRoomByQrToken, createRoomRequest, fetchRoomBill } from '@/lib/hotelService';
import type { HotelRoom, RequestType, RoomBill, HotelServicesConfig } from '@/types/hotel';
import { DEFAULT_HOTEL_SERVICES_CONFIG } from '@/types/hotel';
import { triggerHaptic } from '@/lib/haptics';

export function RoomServiceLandingPage() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<HotelRoom | null>(null);
  const [hotel, setHotel] = useState<any | null>(null);
  const [servicesConfig, setServicesConfig] = useState<HotelServicesConfig>(DEFAULT_HOTEL_SERVICES_CONFIG);

  // Modals & Popups
  const [activeModal, setActiveModal] = useState<RequestType | 'BILL' | 'FEEDBACK' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // Form inputs
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [selectedQuickItem, setSelectedQuickItem] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);

  // Bill state
  const [billData, setBillData] = useState<RoomBill | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!qrToken) {
        setError('No Room QR token provided.');
        setLoading(false);
        return;
      }
      try {
        const { room: foundRoom, restaurant, servicesConfig: cfg, error: roomErr } = await getRoomByQrToken(qrToken);
        if (roomErr || !foundRoom) {
          setError(roomErr || 'Room not found or QR token expired.');
        } else {
          setRoom(foundRoom);
          setHotel(restaurant);
          if (cfg) {
            setServicesConfig(cfg);
          }
          document.title = `Room ${foundRoom.room_number} | ${restaurant?.name || 'Hotel Guest Portal'}`;
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect to hotel services.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [qrToken]);

  // Open Room Bill
  const handleOpenBill = async () => {
    if (!room || !hotel) return;
    setActiveModal('BILL');
    setBillLoading(true);
    triggerHaptic('light');
    try {
      const data = await fetchRoomBill(
        room.restaurant_id,
        room.id,
        room.price_per_night || 3500,
        room.room_number
      );
      setBillData(data);
    } catch (_) {
    } finally {
      setBillLoading(false);
    }
  };

  // Submit Guest Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !hotel || !activeModal || activeModal === 'BILL') return;

    setSubmitting(true);
    triggerHaptic('medium');

    const desc = selectedQuickItem
      ? `${selectedQuickItem}${requestNotes ? ` — ${requestNotes}` : ''}`
      : requestNotes || `${activeModal} service request from guest`;

    const priority =
      activeModal === 'MAINTENANCE' || activeModal === 'WATER' ? 'HIGH' : 'NORMAL';

    const { error: reqErr } = await createRoomRequest({
      restaurant_id: room.restaurant_id,
      room_id: room.id,
      room_number: room.room_number,
      request_type: activeModal === 'FEEDBACK' ? 'OTHER' : activeModal,
      description: desc,
      notes: activeModal === 'FEEDBACK' ? `Guest Rating: ${feedbackRating}/5 Stars` : undefined,
      priority,
      guest_name: guestName || undefined,
      guest_mobile: guestMobile || undefined,
    });

    setSubmitting(false);

    if (reqErr) {
      alert(`Could not place request: ${reqErr}`);
    } else {
      triggerHaptic('success');
      setRequestSuccess(`Your request for ${activeModal.replace('_', ' ')} has been sent to staff!`);
      setActiveModal(null);
      setRequestNotes('');
      setSelectedQuickItem('');
      setTimeout(() => setRequestSuccess(null), 6000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
        <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
        <p className="text-sm font-bold text-slate-700">Connecting to Room Services...</p>
        <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800 font-sans">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-500 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Room Service Unavailable</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          {error || 'We could not detect your room number. Please scan the QR code placed on your nightstand again.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition"
        >
          Open QR Scanner
        </button>
      </div>
    );
  }

  const frontDeskPhone = servicesConfig.reception_phone || hotel?.mobile || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Ambient Image / Hero Section */}
      <div className="relative h-60 sm:h-68 w-full overflow-hidden bg-slate-950 shadow-sm">
        <img
          src={room.image_url || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80'}
          alt={`Room ${room.room_number}`}
          className="w-full h-full object-cover opacity-65 scale-105 filter saturate-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/25" />

        {/* Top Header Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wide uppercase text-slate-800">
              Live Room Service
            </span>
          </div>

          {servicesConfig.view_bill !== false && (
            <button
              onClick={() => handleOpenBill()}
              className="flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/40 text-xs font-bold shadow-xs transition active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
              <span>View Bill</span>
            </button>
          )}
        </div>

        {/* Room Headline */}
        <div className="absolute bottom-5 left-4 right-4 z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest drop-shadow-sm">
              {hotel?.name || 'Grand Luxury Resort & Suites'}
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-white/80 font-medium">
              Floor {room.floor_number}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Room {room.room_number}</span>
            <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-0.5 rounded-full shadow-xs">
              {room.room_type}
            </span>
          </h1>
          {room.room_name && (
            <p className="text-xs text-white/90 mt-0.5 font-medium drop-shadow-sm">{room.room_name}</p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4 relative z-20">
        {/* Success Alert Banner */}
        {requestSuccess && (
          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-3.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            <span className="font-semibold leading-relaxed">{requestSuccess}</span>
          </div>
        )}

        {/* PRIMARY ACTION: Order Food Banner (Decided by restaurant config) */}
        {servicesConfig.order_food !== false && (
          <div
            onClick={() => {
              triggerHaptic('medium');
              navigate(`/menu/${qrToken}`);
            }}
            className="relative overflow-hidden cursor-pointer rounded-2xl p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-950/15 border border-emerald-500/30 group active:scale-[0.98] transition-all"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider text-white">
                  <UtensilsCrossed className="w-3 h-3" /> In-Room Dining
                </span>
                <h2 className="text-xl font-black text-white">Order Food to Room</h2>
                <p className="text-xs text-emerald-50 max-w-[220px] leading-relaxed">
                  Fresh chef specials, drinks, and snacks delivered to Room {room.room_number}.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                <ArrowRight className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* Guest Services Grid (Filtered by restaurant configuration) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Guest Services & Requests
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Touch to request</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 1. Water Service */}
            {servicesConfig.water !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('WATER');
                  setSelectedQuickItem('2 Fresh Bottled Water (1 Litre)');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Request Water</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Packaged drinking bottles</p>
                </div>
              </button>
            )}

            {/* 2. Housekeeping */}
            {servicesConfig.housekeeping !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('HOUSEKEEPING');
                  setSelectedQuickItem('Complete Room Cleaning');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Housekeeping</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cleaning & linen change</p>
                </div>
              </button>
            )}

            {/* 3. Fresh Towels */}
            {servicesConfig.room_service !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('TOWEL');
                  setSelectedQuickItem('Set of 2 Fresh Bath Towels');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Fresh Towels</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Bath & hand towels</p>
                </div>
              </button>
            )}

            {/* 4. Laundry Service */}
            {servicesConfig.laundry !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('LAUNDRY');
                  setSelectedQuickItem('Laundry Bag Pickup');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Shirt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Laundry</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Wash & steam press</p>
                </div>
              </button>
            )}

            {/* 5. Maintenance / Report Issue */}
            {servicesConfig.maintenance !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('MAINTENANCE');
                  setSelectedQuickItem('AC Temperature / Cooling Issue');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Maintenance</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">AC, TV, Wi-Fi, plumbing</p>
                </div>
              </button>
            )}

            {/* 6. Wake-up Call */}
            {servicesConfig.wakeup !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('WAKE_UP_CALL');
                  setSelectedQuickItem('Wake-up call tomorrow at 7:00 AM');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <AlarmClock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Wake-up Call</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Morning reminder</p>
                </div>
              </button>
            )}

            {/* 7. Taxi / Cab Booking */}
            {servicesConfig.taxi !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('TAXI');
                  setSelectedQuickItem('Taxi to Airport / Station');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Taxi / Cab</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Airport & local travel</p>
                </div>
              </button>
            )}

            {/* 8. Room Service Attendant */}
            {servicesConfig.room_service !== false && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal('ROOM_SERVICE');
                  setSelectedQuickItem('General In-Room Staff Assistance');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 text-left space-y-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">Room Service</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Call room attendant</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Quick Contact & Feedback Row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Contact Reception */}
          {servicesConfig.reception !== false && (
            <a
              href={frontDeskPhone ? `tel:${frontDeskPhone}` : '#'}
              onClick={(e) => {
                if (!frontDeskPhone) {
                  e.preventDefault();
                  alert('Front desk phone number has not been set yet.');
                }
              }}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-left transition active:scale-95 shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/80 flex items-center justify-center shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Reception</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {frontDeskPhone ? 'Dial Front Desk' : 'Call Front Desk'}
                </p>
              </div>
            </a>
          )}

          {/* Feedback */}
          {servicesConfig.feedback !== false && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('FEEDBACK');
              }}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-left transition active:scale-95 shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-100/80 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Feedback</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Rate your stay</p>
              </div>
            </button>
          )}
        </div>

        {/* Room Info Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-xs space-y-2.5 text-slate-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500">Room Type & Bed</span>
            <span className="text-slate-900 font-bold">{room.room_type} • {room.bed_type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500">Max Occupancy</span>
            <span className="text-slate-900 font-bold">{room.capacity} Guests</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500">Included Amenities</span>
            <span className="text-slate-700 font-medium truncate max-w-[200px]">
              {room.amenities?.join(', ') || 'Wi-Fi, AC, Smart TV, Hot Water'}
            </span>
          </div>
        </div>
      </div>

      {/* SERVICE REQUEST MODAL (White Theme) */}
      {activeModal && activeModal !== 'BILL' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="text-base font-black text-slate-900 capitalize">
                  {activeModal === 'FEEDBACK' ? 'Guest Stay Feedback' : `${activeModal.replace(/_/g, ' ')} Request`}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              {activeModal === 'FEEDBACK' ? (
                /* Rating Stars */
                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-slate-600 font-medium">How was your stay in Room {room.room_number}?</p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className="p-1 transition-transform active:scale-125"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= feedbackRating
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-200 fill-slate-100'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Quick Choice Options */
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Quick Selection</label>
                  <select
                    value={selectedQuickItem}
                    onChange={(e) => setSelectedQuickItem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                  >
                    {activeModal === 'WATER' && (
                      <>
                        <option value="2 Fresh Bottled Water (1 Litre)">2 Bottles Packaged Water (1 Litre)</option>
                        <option value="4 Fresh Bottled Water (1 Litre)">4 Bottles Packaged Water (1 Litre)</option>
                        <option value="Warm / Hot Drinking Water">Warm / Hot Drinking Water</option>
                      </>
                    )}
                    {activeModal === 'HOUSEKEEPING' && (
                      <>
                        <option value="Complete Room Cleaning">Complete Room Cleaning</option>
                        <option value="Bed Making & Sheet Change">Bed Making & Sheet Change</option>
                        <option value="Restock Toiletries (Soap, Shampoo, Dental Kit)">Restock Toiletries</option>
                        <option value="Empty Dustbin & Trash Clearance">Empty Dustbin</option>
                      </>
                    )}
                    {activeModal === 'TOWEL' && (
                      <>
                        <option value="Set of 2 Fresh Bath Towels">2 Fresh Bath Towels</option>
                        <option value="Extra Hand Towels & Floor Mat">Hand Towels & Floor Mat</option>
                        <option value="Extra Soft Pillows (2)">Extra Pillows (2)</option>
                        <option value="Extra Warm Blanket / Quilt">Extra Warm Blanket</option>
                      </>
                    )}
                    {activeModal === 'MAINTENANCE' && (
                      <>
                        <option value="AC Temperature / Cooling Issue">AC Cooling Issue</option>
                        <option value="Wi-Fi Connection Slow / Disconnected">Wi-Fi Connection Issue</option>
                        <option value="Television / Remote Problem">TV / Cable Problem</option>
                        <option value="Bathroom Hot Water / Shower Issue">Bathroom Shower / Geyser Issue</option>
                        <option value="Electrical Socket / Lighting">Lighting or Socket Problem</option>
                      </>
                    )}
                    {activeModal === 'LAUNDRY' && (
                      <>
                        <option value="Regular Laundry Bag Pickup">Regular Laundry Bag Pickup</option>
                        <option value="Express Steam Iron / Press">Express Steam Iron / Press</option>
                        <option value="Dry Cleaning Collection">Dry Cleaning Collection</option>
                      </>
                    )}
                    {activeModal === 'TAXI' && (
                      <>
                        <option value="Airport Drop Cab">Airport Drop Cab</option>
                        <option value="Railway Station Taxi">Railway Station Taxi</option>
                        <option value="Local Sightseeing Cab Booking">Local Sightseeing Cab</option>
                      </>
                    )}
                    {activeModal === 'WAKE_UP_CALL' && (
                      <>
                        <option value="Wake-up call tomorrow at 6:00 AM">Wake-up call tomorrow at 6:00 AM</option>
                        <option value="Wake-up call tomorrow at 7:00 AM">Wake-up call tomorrow at 7:00 AM</option>
                        <option value="Wake-up call tomorrow at 8:00 AM">Wake-up call tomorrow at 8:00 AM</option>
                      </>
                    )}
                    {activeModal === 'ROOM_SERVICE' && (
                      <>
                        <option value="General In-Room Staff Assistance">General In-Room Staff Assistance</option>
                        <option value="Cutlery & Plate Set (2 Guests)">Cutlery & Plates Set</option>
                        <option value="Ice Bucket & Glasses">Ice Bucket & Glasses</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Special Instructions / Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {activeModal === 'FEEDBACK' ? 'Comments / Suggestions' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder={
                    activeModal === 'FEEDBACK'
                      ? 'Tell us what you loved or how we can improve...'
                      : 'e.g. Please ring bell twice, deliver around 4 PM...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none resize-none"
                />
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Guest Name"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={guestMobile}
                    onChange={(e) => setGuestMobile(e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send to Staff</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM BILL MODAL (White Theme) */}
      {activeModal === 'BILL' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100/80 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Live Bill • Room {room.room_number}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {billLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                <p className="text-xs font-medium">Calculating room stay and order charges...</p>
              </div>
            ) : billData ? (
              <div className="space-y-4">
                {/* Itemized list */}
                <div className="space-y-2 divide-y divide-slate-100">
                  {billData.items.map((item) => (
                    <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{item.title}</p>
                        {item.details && (
                          <p className="text-[10px] text-slate-400">{item.details}</p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {hotel?.currency_symbol || '₹'}{item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bill Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {hotel?.currency_symbol || '₹'}{billData.subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes & GST (12%)</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {hotel?.currency_symbol || '₹'}{billData.tax_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                    <span>Total Amount Payable</span>
                    <span className="font-mono text-emerald-700 font-black">
                      {hotel?.currency_symbol || '₹'}{billData.grand_total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Room charges and in-room dining orders can be settled at the reception during check-out.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
