// src/pages/customer/RoomServiceLandingPage.tsx
import { useState, useEffect, useId } from 'react';
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
  Layers,
  ArrowRight,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { getRoomByQrToken, createRoomRequest, fetchRoomBill } from '@/lib/hotelService';
import type { HotelRoom, RequestType, RoomBill } from '@/types/hotel';
import { triggerHaptic } from '@/lib/haptics';

export function RoomServiceLandingPage() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<HotelRoom | null>(null);
  const [hotel, setHotel] = useState<any | null>(null);

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
        const { room: foundRoom, restaurant, error: roomErr } = await getRoomByQrToken(qrToken);
        if (roomErr || !foundRoom) {
          setError(roomErr || 'Room not found or QR token expired.');
        } else {
          setRoom(foundRoom);
          setHotel(restaurant);
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
        <p className="text-sm font-bold text-slate-300">Connecting to Room Services...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black mb-2">Room Service Unavailable</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {error || 'We could not detect your room number. Please scan the QR code placed on your nightstand again.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-amber-400 text-slate-950 rounded-xl font-bold text-xs"
        >
          Open QR Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-amber-400 selection:text-slate-950">
      {/* Top Ambient Image / Banner */}
      <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <img
          src={room.image_url || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80'}
          alt={`Room ${room.room_number}`}
          className="w-full h-full object-cover opacity-35 filter blur-xs scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Top Header Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wide uppercase text-slate-300">
              Live Room Service
            </span>
          </div>

          <button
            onClick={() => handleOpenBill()}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-bold transition text-white active:scale-95"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>View Bill</span>
          </button>
        </div>

        {/* Room Headline */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              {hotel?.name || 'Grand Resort & Suites'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-medium">
              Floor {room.floor_number}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Room {room.room_number}</span>
            <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-sm">
              {room.room_type}
            </span>
          </h1>
          {room.room_name && (
            <p className="text-xs text-slate-300 mt-0.5">{room.room_name}</p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto px-4 -mt-2 space-y-4">
        {/* Success Alert Banner */}
        {requestSuccess && (
          <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl p-3.5 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <span className="font-semibold leading-relaxed">{requestSuccess}</span>
          </div>
        )}

        {/* PRIMARY ACTION: Order Food Banner */}
        <div
          onClick={() => {
            triggerHaptic('medium');
            navigate(`/menu/${qrToken}`);
          }}
          className="relative overflow-hidden cursor-pointer rounded-2xl p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-950/40 border border-emerald-500/40 group active:scale-[0.98] transition-all"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                <UtensilsCrossed className="w-3 h-3" /> In-Room Dining
              </span>
              <h2 className="text-xl font-black text-white">Order Food to Room</h2>
              <p className="text-xs text-emerald-100 max-w-[220px]">
                Fresh chef specials, drinks, and snacks delivered to Room {room.room_number}.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
              <ArrowRight className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Guest Services Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Guest Services & Requests
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">Touch to request</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 1. Quick Water Request */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('WATER');
                setSelectedQuickItem('2 Fresh Bottled Water (1 Litre)');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Request Water</p>
                <p className="text-[11px] text-slate-400">Packaged drinking bottles</p>
              </div>
            </button>

            {/* 2. Housekeeping */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('HOUSEKEEPING');
                setSelectedQuickItem('Complete Room Cleaning');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Housekeeping</p>
                <p className="text-[11px] text-slate-400">Cleaning & linen change</p>
              </div>
            </button>

            {/* 3. Fresh Towels & Amenities */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('TOWEL');
                setSelectedQuickItem('Set of 2 Fresh Bath Towels');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Fresh Towels</p>
                <p className="text-[11px] text-slate-400">Bath & hand towels</p>
              </div>
            </button>

            {/* 4. Laundry Service */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('LAUNDRY');
                setSelectedQuickItem('Laundry Bag Pickup');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Laundry</p>
                <p className="text-[11px] text-slate-400">Wash & steam press</p>
              </div>
            </button>

            {/* 5. Maintenance / Report Issue */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('MAINTENANCE');
                setSelectedQuickItem('AC Temperature / Cooling Issue');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Maintenance</p>
                <p className="text-[11px] text-slate-400">AC, TV, Wi-Fi, plumbing</p>
              </div>
            </button>

            {/* 6. Wake-up Call */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('WAKE_UP_CALL');
                setSelectedQuickItem('Wake-up call tomorrow at 7:00 AM');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlarmClock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Wake-up Call</p>
                <p className="text-[11px] text-slate-400">Morning wake-up reminder</p>
              </div>
            </button>

            {/* 7. Taxi / Cab Booking */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('TAXI');
                setSelectedQuickItem('Taxi to Airport / Station');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Taxi / Cab</p>
                <p className="text-[11px] text-slate-400">Airport & local travel</p>
              </div>
            </button>

            {/* 8. Room Service Assistance */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveModal('ROOM_SERVICE');
                setSelectedQuickItem('General In-Room Staff Assistance');
              }}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-left space-y-2.5 transition active:scale-95 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Room Service</p>
                <p className="text-[11px] text-slate-400">Call room attendant</p>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Contact & Feedback Row */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Contact Reception */}
          <a
            href={`tel:${hotel?.mobile || '+919999999999'}`}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Reception</p>
              <p className="text-[10px] text-slate-400">Dial Front Desk</p>
            </div>
          </a>

          {/* Feedback */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveModal('FEEDBACK');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Feedback</p>
              <p className="text-[10px] text-slate-400">Rate your stay</p>
            </div>
          </button>
        </div>

        {/* Room Info Card */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2 text-slate-400">
          <div className="flex items-center justify-between">
            <span className="font-medium">Room Type & Bed</span>
            <span className="text-white font-bold">{room.room_type} • {room.bed_type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Max Occupancy</span>
            <span className="text-white font-bold">{room.capacity} Guests</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Included Amenities</span>
            <span className="text-slate-300 font-medium">Wi-Fi, AC, Smart TV</span>
          </div>
        </div>
      </div>

      {/* SERVICE REQUEST MODAL */}
      {activeModal && activeModal !== 'BILL' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-base font-black text-white capitalize">
                  {activeModal === 'FEEDBACK' ? 'Guest Stay Feedback' : `${activeModal.replace(/_/g, ' ')} Request`}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              {activeModal === 'FEEDBACK' ? (
                /* Rating Stars */
                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-slate-300 font-medium">How was your stay in Room {room.room_number}?</p>
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
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Quick Choice Options */
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Quick Selection</label>
                  <select
                    value={selectedQuickItem}
                    onChange={(e) => setSelectedQuickItem(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
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
                <label className="block text-xs font-bold text-slate-300">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Guest Name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={guestMobile}
                    onChange={(e) => setGuestMobile(e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
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

      {/* ROOM BILL MODAL */}
      {activeModal === 'BILL' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  Live Bill • Room {room.room_number}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {billLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-2" />
                <p className="text-xs">Calculating room stay and order charges...</p>
              </div>
            ) : billData ? (
              <div className="space-y-4">
                {/* Itemized list */}
                <div className="space-y-2 divide-y divide-slate-800/80">
                  {billData.items.map((item) => (
                    <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{item.title}</p>
                        {item.details && (
                          <p className="text-[10px] text-slate-400">{item.details}</p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-200">
                        {hotel?.currency_symbol || '₹'}{item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bill Breakdown */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">
                      {hotel?.currency_symbol || '₹'}{billData.subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taxes & GST (12%)</span>
                    <span className="font-mono text-white">
                      {hotel?.currency_symbol || '₹'}{billData.tax_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-white">
                    <span>Total Amount Payable</span>
                    <span className="font-mono text-amber-400">
                      {hotel?.currency_symbol || '₹'}{billData.grand_total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 text-center">
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
