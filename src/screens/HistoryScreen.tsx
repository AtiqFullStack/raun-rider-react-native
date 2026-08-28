import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { api } from '../services/apiClient';
import CommonHeader from '../components/common/Header';
import SafeWrapper from '../components/SafeWrapper';
import BottomSheet from '../components/common/BottomSheet';
import { fontScale, scale, vw } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/common/Header';

// ── Types ─────────────────────────────────────────────────────────────────────
type TripStatus = 'All' | 'Completed' | 'Cancelled';
type DateFilter = 'This Week' | 'This Month' | 'Custom' | '';

interface Trip {
  id: string; tripId: string; customerName: string;
  status: 'Completed' | 'Cancelled'; amount: number;
  pickupAddress: string; dropoffAddress: string;
  date: string; time: string;
}

interface Summary {
  totalTrips: number; completedTrips: number;
  cancelledTrips: number; totalEarnings: number;
}

const STATUS_TABS: TripStatus[] = ['All', 'Completed', 'Cancelled'];
const DATE_CHIPS: DateFilter[]  = ['This Week', 'This Month', 'Custom'];
const EMPTY_STATE_COPY: Record<TripStatus, { title: string; subtitle: string }> = {
  All: {
    title: 'No trips yet',
    subtitle: 'Your completed, cancelled, and pending trips will appear here.',
  },
  Completed: {
    title: 'No completed trips yet',
    subtitle: 'Your completed trips will appear here.',
  },
  Cancelled: {
    title: 'No cancelled trips yet',
    subtitle: 'Your cancelled trips will appear here.',
  },
};
const STATUS_CONFIG = {
  Completed: { color: '#22C55E', bg: '#22C55E18', icon: '✓' },
  Cancelled: { color: '#EF4444', bg: '#EF444418', icon: '✕' },
};

// ── Component ─────────────────────────────────────────────────────────────────
const HistoryScreen: React.FC = () => {
  const [tab, setTab]                   = useState<TripStatus>('All');
  const [dateFilter, setDateFilter]     = useState<DateFilter>('');
  const [search, setSearch]             = useState('');
  const [trips, setTrips]               = useState<Trip[]>([]);
  const [summary, setSummary]           = useState<Summary>({ totalTrips: 0, completedTrips: 0, cancelledTrips: 0, totalEarnings: 0 });
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [showCalendar, setShowCalendar] = useState<'from' | 'to' | null>(null);
  const [customFrom, setCustomFrom]     = useState<Date | null>(null);
  const [customTo, setCustomTo]         = useState<Date | null>(null);
  const [calMonth, setCalMonth]         = useState(new Date());
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const scrollY                         = useRef(new Animated.Value(0)).current;

  // ── Build backend params ──────────────────────────────────────────────────
  // body → only status
  const buildBody = useCallback(() => {
    if (tab === 'Completed') return { status: 'DELIVERY_COMPLETED' };
    if (tab === 'Cancelled') return { status: 'DELIVERY_CANCELLED' };
    return { status: 'ALL' };
  }, [tab]);

  // query params → search, filterBy, fromDate, toDate
  const buildQuery = useCallback(() => {
    const q: Record<string, string> = {};
    if (search.trim()) q.search = search.trim();
    if (dateFilter === 'This Week')  q.filterBy = 'THIS_WEEK';
    if (dateFilter === 'This Month') q.filterBy = 'THIS_MONTH';
    if (dateFilter === 'Custom' && customFrom) {
      q.fromDate = customFrom.toISOString().split('T')[0];
      q.toDate   = (customTo ?? customFrom).toISOString().split('T')[0];
    }
    return q;
  }, [search, dateFilter, customFrom, customTo]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery();
      const queryStr = Object.keys(q).map(k => `${k}=${encodeURIComponent(q[k])}`).join('&');
      const url = `/user/trip/trip-history${queryStr ? `?${queryStr}` : ''}`;
      const res = await api.post(url, buildBody());
      const raw = res.data?.data;
      setSummary(raw?.summary ?? { totalTrips: 0, completedTrips: 0, cancelledTrips: 0, totalEarnings: 0 });
      setTrips((raw?.trips ?? []).map((t: any) => ({
        id:             t._id,
        tripId:         t.tripId,
        customerName:   t.customerId?.fullName || 'Unknown',
        status:         t.status === 'DELIVERY_CANCELLED' ? 'Cancelled' : 'Completed',
        amount:         Number(t.orderId?.finalPrice ?? 0),
        pickupAddress:  t.orderId?.pickup?.address || '',
        dropoffAddress: t.orderId?.drop?.address   || '',
        date: new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        time: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })));
    } catch (e: any) {
      if (e?.message?.includes('400')) { setTrips([]); }
      else { console.error('fetchTrips:', e?.message); setTrips([]); }
    } finally { setLoading(false); }
  }, [buildBody, buildQuery]);

  // re-fetch on every filter change
  useEffect(() => { fetchTrips(); }, [tab, dateFilter, customFrom, customTo]);

  // re-fetch on search (debounced 400ms)
  useEffect(() => {
    const t = setTimeout(() => fetchTrips(), 400);
    return () => clearTimeout(t);
  }, [search]);

  useFocusEffect(useCallback(() => { fetchTrips(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const calDays = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const total    = new Date(y, m + 1, 0).getDate();
    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1)),
    ];
  }, [calMonth]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isInRange = (d: Date) => {
    if (!customFrom) return false;
    const from = new Date(customFrom); from.setHours(0, 0, 0, 0);
    const to   = customTo ? new Date(customTo) : new Date(customFrom); to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const customLabel = useMemo(() => {
    if (!customFrom) return 'Custom Date';
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return customTo ? `${fmt(customFrom)} – ${fmt(customTo)}` : fmt(customFrom);
  }, [customFrom, customTo]);

  const handleDayPress = (day: Date) => {
    if (showCalendar === 'from') {
      setCustomFrom(day); setCustomTo(null); setShowCalendar('to');
    } else {
      if (customFrom && day < customFrom) { setCustomFrom(day); setCustomTo(null); setShowCalendar('to'); }
      else { setCustomTo(day); setShowCalendar(null); }
    }
  };

  // ── Row ───────────────────────────────────────────────────────────────────
  const renderRow = ({ item, index }: { item: Trip; index: number }) => {
    const cfg = STATUS_CONFIG[item.status];
    const isLast = index === trips.length - 1;
    return (
      <View style={[styles.card, isLast && { marginBottom: 0 }]}>
        {/* Top row: icon + trip id + amount */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconWrap, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.cardIconText, { color: cfg.color }]}>{cfg.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTripId}>{item.tripId}</Text>
            <Text style={[styles.cardStatus, { color: cfg.color }]}>{item.status}</Text>
          </View>
          <View style={styles.cardAmountWrap}>
            <Text style={[styles.cardAmount, { color: item.status === 'Completed' ? '#22C55E' : Colors.Textgray }]}>
              {item.status === 'Cancelled' ? '—' : `₹${item.amount.toFixed(0)}`}
            </Text>
            <Text style={styles.cardAmountLabel}>Earned</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routeDots}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
          </View>
          <View style={{ flex: 1, gap: scale(6) }}>
            <Text style={styles.routeAddr} numberOfLines={1}>{item.pickupAddress.split(',')[0] || '—'}</Text>
            <Text style={styles.routeAddr} numberOfLines={1}>{item.dropoffAddress.split(',')[0] || '—'}</Text>
          </View>
        </View>

        {/* Footer: date/time + details btn */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>🕐 {item.date}  ·  {item.time}</Text>
          <TouchableOpacity style={styles.detailsBtn} onPress={() => setSelectedTrip(item)}>
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* Customer chip */}
        <View style={styles.customerChip}>
          <Text style={styles.customerChipText}>👤 {item.customerName}</Text>
        </View>
      </View>
    );
  };

  // ── Trip Detail Bottom Sheet ──────────────────────────────────────────────
  const TripDetailSheet = (
    <BottomSheet visible={!!selectedTrip} onClose={() => setSelectedTrip(null)}>
      {selectedTrip && (() => {
        const cfg = STATUS_CONFIG[selectedTrip.status];
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status badge */}
            <View style={styles.sheetStatusRow}>
              <View style={[styles.sheetBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.sheetBadgeText, { color: cfg.color }]}>{selectedTrip.status}</Text>
              </View>
              <Text style={styles.sheetTripId}>{selectedTrip.tripId}</Text>
            </View>

            {/* Amount */}
            <View style={styles.sheetAmountBox}>
              <Text style={styles.sheetAmountLabel}>Total Earned</Text>
              <Text style={[styles.sheetAmountValue, { color: selectedTrip.status === 'Completed' ? '#22C55E' : Colors.Textgray }]}>
                {selectedTrip.status === 'Cancelled' ? '—' : `₹${selectedTrip.amount.toFixed(2)}`}
              </Text>
            </View>

            {/* Route detail */}
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>Route</Text>
              <View style={styles.sheetRouteCard}>
                <View style={styles.routeDots}>
                  {/* <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} /> */}
                  <View style={styles.routeLine} />
                 
                </View>
                <View style={{ flex: 1, gap: scale(10) }}>
                  <View>
                    <Text style={styles.sheetAddrLabel}>Pickup</Text>
                    <Text style={styles.sheetAddrText}>{selectedTrip.pickupAddress || '—'}</Text>
                  </View>
                  <View>
               
                   
                    <Text style={styles.sheetAddrLabel}>Drop-off</Text>
             
                    
                    <Text style={styles.sheetAddrText}>{selectedTrip.dropoffAddress || '—'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Info rows */}
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>Details</Text>
              {[
                { label: 'Customer',  value: selectedTrip.customerName },
                { label: 'Date',      value: selectedTrip.date },
                { label: 'Time',      value: selectedTrip.time },
              ].map(r => (
                <View key={r.label} style={styles.sheetInfoRow}>
                  <Text style={styles.sheetInfoLabel}>{r.label}</Text>
                  <Text style={styles.sheetInfoValue}>{r.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        );
      })()}
    </BottomSheet>
  );

  // ── List header ───────────────────────────────────────────────────────────
  const ListHeader = (
    <>
      {/* KPI strip — from backend summary */}
      <View style={styles.kpiStrip}>
        {[
          { label: 'Trips',     value: summary.totalTrips,                      color: Colors.primary },
          { label: 'Done',      value: summary.completedTrips,                  color: '#22C55E'      },
          { label: 'Cancelled', value: summary.cancelledTrips,                  color: '#EF4444'      },
          { label: 'Earned',    value: `$${Number(summary.totalEarnings).toFixed(0)}`, color: Colors.black },
        ].map((k, i, arr) => (
          <React.Fragment key={k.label}>
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.kpiDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Section header + search + chips */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trip History</Text>

        <View style={styles.searchRow}>
          <Text style={styles.searchIconEmoji}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by trip ID or Destination"
            placeholderTextColor={Colors.Textgray}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearX}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.chipsRow}>
          {DATE_CHIPS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, dateFilter === c && styles.chipActive]}
              onPress={() => {
                if (c === 'Custom') {
                  setDateFilter('Custom'); setCustomFrom(null); setCustomTo(null);
                  setCalMonth(new Date()); setShowCalendar('from');
                } else {
                  setDateFilter(p => p === c ? '' : c);
                }
              }}
            >
              <Text style={[styles.chipText, dateFilter === c && styles.chipTextActive]}>
                {c === 'Custom' ? `📅 ${customLabel}` : `📅 ${c}`}
              </Text>
            </TouchableOpacity>
          ))}
          {dateFilter !== '' && (
            <TouchableOpacity style={styles.chipClear} onPress={() => { setDateFilter(''); setCustomFrom(null); setCustomTo(null); }}>
              <Text style={styles.chipClearText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsBar}>
        {STATUS_TABS.map(t => (
          <TouchableOpacity key={t} style={styles.tabItem} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  // ── Calendar bottom sheet ─────────────────────────────────────────────────
  const CalendarModal = showCalendar ? (
    <View style={styles.calOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowCalendar(null)} />
      <View style={styles.calSheet}>
        <View style={styles.calHandle} />
        <Text style={styles.calTitle}>
          {showCalendar === 'from' ? '📅 Select Start Date' : '📅 Select End Date'}
        </Text>
        {customFrom && showCalendar === 'to' && (
          <Text style={styles.calSubtitle}>
            From: {customFrom.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        )}
        <View style={styles.calMonthRow}>
          <TouchableOpacity style={styles.calMonthBtn} onPress={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <Text style={styles.calMonthArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calMonthLabel}>{calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity style={styles.calMonthBtn} onPress={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <Text style={styles.calMonthArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calWeekRow}>
          {['S','M','T','W','T','F','S'].map((d, i) => <Text key={i} style={styles.calWeekDay}>{d}</Text>)}
        </View>
        <View style={styles.calGrid}>
          {calDays.map((day, i) => {
            if (!day) return <View key={`e-${i}`} style={styles.calDayCell} />;
            const isFrom = customFrom ? isSameDay(day, customFrom) : false;
            const isTo   = customTo   ? isSameDay(day, customTo)   : false;
            const inRng  = isInRange(day);
            const isFut  = day > new Date();
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[styles.calDayCell, (isFrom || isTo) && styles.calDaySelected, inRng && !isFrom && !isTo && styles.calDayInRange]}
                onPress={() => !isFut && handleDayPress(day)}
                disabled={isFut}
              >
                <Text style={[styles.calDayText, (isFrom || isTo) && styles.calDayTextSelected, isFut && styles.calDayTextDisabled]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.calActions}>
          <TouchableOpacity style={styles.calCancelBtn} onPress={() => { setShowCalendar(null); if (!customFrom) setDateFilter(''); }}>
            <Text style={styles.calCancelText}>Cancel</Text>
          </TouchableOpacity>
          {showCalendar === 'to' && customFrom && (
            <TouchableOpacity style={styles.calDoneBtn} onPress={() => { setCustomTo(customFrom); setShowCalendar(null); }}>
              <Text style={styles.calDoneText}>Same Day</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  ) : null;

  
  return (
    <SafeWrapper backgroundColor={Colors.bg}>
      <Header showBackButton={true} simpleHeaderTitle='History' showBadge={false} simpleHeader={true} />
      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={i => i.id}
          renderItem={renderRow}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: scale(30) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚚</Text>
              <Text style={styles.emptyTitle}>{EMPTY_STATE_COPY[tab].title}</Text>
              <Text style={styles.emptySub}>{EMPTY_STATE_COPY[tab].subtitle}</Text>
            </View>
          }
        />
      )}
      {CalendarModal}
      {TripDetailSheet}
    </SafeWrapper>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kpiStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingVertical: scale(10), paddingHorizontal: vw(4), borderBottomWidth: 1, borderBottomColor: Colors.borderColor1 },
  kpiItem:    { flex: 1, alignItems: 'center' },
  kpiValue:   { fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(18), lineHeight: fontScale(22) },
  kpiLabel:   { fontFamily: 'Rubik-Regular', fontSize: fontScale(10), color: Colors.Textgray, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiDivider: { width: 1, height: scale(28), backgroundColor: Colors.borderColor2 },
  sectionHeader: { backgroundColor: Colors.white, paddingHorizontal: vw(4), paddingTop: scale(14), paddingBottom: scale(6) },
  sectionTitle:  { fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(18), color: Colors.black, marginBottom: scale(10) },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: scale(50), borderWidth: 1, borderColor: Colors.borderColor2, paddingHorizontal: scale(10), marginBottom: scale(10) },
  searchIconEmoji: { fontSize: fontScale(14), marginRight: scale(6) },
  searchInput: { flex: 1, fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.black, paddingVertical: scale(8) },
  clearX: { fontSize: fontScale(13), color: Colors.Textgray, paddingLeft: scale(6) },
  chipsRow:       { flexDirection: 'row', gap: scale(8), marginBottom: scale(4), flexWrap: 'wrap' },
  chip:           { paddingHorizontal: scale(12), paddingVertical: scale(5), borderRadius: scale(20), borderWidth: 1, borderColor: Colors.borderColor2, backgroundColor: Colors.white },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.Textgray },
  chipTextActive: { color: Colors.white, fontFamily: 'Rubik-Medium' },
  chipClear:      { paddingHorizontal: scale(12), paddingVertical: scale(5), borderRadius: scale(20), backgroundColor: Colors.lightRed, borderWidth: 1, borderColor: Colors.red },
  chipClearText:  { fontFamily: 'Rubik-Medium', fontSize: fontScale(11), color: Colors.red },
  tabsBar:       { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderColor1, paddingHorizontal: vw(4), gap: scale(20) },
  tabItem:       { paddingVertical: scale(10), position: 'relative' },
  tabText:       { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.Textgray },
  tabTextActive: { color: Colors.primary, fontFamily: 'Rubik-SemiBold' },
  tabUnderline:  { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: Colors.primary, borderRadius: 2 },
  // ── Trip Card ────────────────────────────────────────────────────────────
  card:           { backgroundColor: Colors.white, marginHorizontal: vw(4), marginTop: scale(10), borderRadius: scale(14), padding: scale(12), shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(10) },
  cardIconWrap:   { width: scale(42), height: scale(42), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  cardIconText:   { fontSize: fontScale(18), fontWeight: '700' },
  cardTripId:     { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.black },
  cardStatus:     { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), textTransform: 'uppercase', letterSpacing: 0.4 },
  cardAmountWrap: { alignItems: 'flex-end' },
  cardAmount:     { fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(16) },
  cardAmountLabel:{ fontFamily: 'Rubik-Regular', fontSize: fontScale(10), color: Colors.Textgray },
  routeRow:       { flexDirection: 'row', gap: scale(10), marginBottom: scale(10), alignItems: 'center' },
  routeDots:      { alignItems: 'center', gap: scale(3), paddingTop: scale(2) },
  routeDot:       { width: scale(8), height: scale(8), borderRadius: scale(4) },
  routeLine:      { width: 1.5, height: scale(14), backgroundColor: Colors.borderColor2 },
  routeAddr:      { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.black1 },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: scale(4), paddingTop: scale(8), borderTopWidth: 1, borderTopColor: Colors.borderColor1 },
  cardMeta:       { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.Textgray },
  detailsBtn:     { paddingHorizontal: scale(14), paddingVertical: scale(5), borderRadius: scale(20), backgroundColor: Colors.primary },
  detailsBtnText: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(11), color: Colors.white },
  customerChip:   { marginTop: scale(8), alignSelf: 'flex-start', backgroundColor: Colors.bg, borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: scale(3) },
  customerChipText: { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.Textgray },
  // ── Detail Sheet ─────────────────────────────────────────────────────────
  sheetStatusRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(12) },
  sheetBadge:      { paddingHorizontal: scale(12), paddingVertical: scale(4), borderRadius: scale(20) },
  sheetBadgeText:  { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(12), textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetTripId:     { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14), color: Colors.black },
  sheetAmountBox:  { backgroundColor: Colors.bg, borderRadius: scale(12), padding: scale(14), alignItems: 'center', marginBottom: scale(16) },
  sheetAmountLabel:{ fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.Textgray, marginBottom: scale(4) },
  sheetAmountValue:{ fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(28) },
  sheetSection:    { marginBottom: scale(16) },
  sheetSectionTitle:{ fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.Textgray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: scale(8) },
  sheetRouteCard:  { flexDirection: 'row', gap: scale(12), backgroundColor: Colors.bg, borderRadius: scale(12), padding: scale(12) },
  sheetAddrLabel:  { fontFamily: 'Rubik-Regular', fontSize: fontScale(10), color: Colors.primary,fontWeight:"800", textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: scale(2) },
  sheetAddrText:   { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.black1 },
  sheetInfoRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: scale(9), borderBottomWidth: 1, borderBottomColor: Colors.borderColor1 },
  sheetInfoLabel:  { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.Textgray },
  sheetInfoValue:  { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.black },
  calOverlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 99, backgroundColor: 'rgba(0,0,0,0.4)' },
  calSheet:      { backgroundColor: Colors.white, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(16), paddingBottom: scale(32) },
  calHandle:     { width: scale(36), height: 4, borderRadius: 2, backgroundColor: Colors.borderColor2, alignSelf: 'center', marginBottom: scale(12) },
  calTitle:      { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(15), color: Colors.black, textAlign: 'center', marginBottom: scale(4) },
  calSubtitle:   { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.Textgray, textAlign: 'center', marginBottom: scale(10) },
  calMonthRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(10) },
  calMonthBtn:   { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  calMonthArrow: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(22), color: Colors.black, lineHeight: fontScale(26) },
  calMonthLabel: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14), color: Colors.black },
  calWeekRow:    { flexDirection: 'row', marginBottom: scale(4) },
  calWeekDay:    { flex: 1, textAlign: 'center', fontFamily: 'Rubik-Medium', fontSize: fontScale(11), color: Colors.Textgray },
  calGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  calDayCell:    { width: `${100 / 7}%`, height: scale(38), alignItems: 'center', justifyContent: 'center', borderRadius: scale(8) },
  calDaySelected:    { backgroundColor: Colors.primary },
  calDayInRange:     { backgroundColor: `${Colors.primary}22` },
  calDayText:        { fontFamily: 'Rubik-Medium', fontSize: fontScale(13), color: Colors.black },
  calDayTextSelected:{ color: Colors.white },
  calDayTextDisabled:{ color: Colors.borderColor2 },
  calActions:    { flexDirection: 'row', gap: scale(10), marginTop: scale(14) },
  calCancelBtn:  { flex: 1, paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: Colors.bg, alignItems: 'center' },
  calCancelText: { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.black1 },
  calDoneBtn:    { flex: 1, paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: Colors.primary, alignItems: 'center' },
  calDoneText:   { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.white },
  empty:     { alignItems: 'center', paddingTop: scale(60), gap: scale(8), paddingHorizontal: vw(10) },
  emptyIcon: { fontSize: fontScale(48) },
  emptyTitle:{ fontFamily: 'Rubik-SemiBold', fontSize: fontScale(16), color: Colors.black },
  emptySub:  { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.Textgray, textAlign: 'center', lineHeight: fontScale(20) },
});
