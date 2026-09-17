import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { useDriverFoodOrderService } from '../services/driverFoodOrderService';
import Header from '../components/common/Header';
import SafeWrapper from '../components/SafeWrapper';
import BottomSheet from '../components/common/BottomSheet';
import { fontScale, scale, vh, vw } from '../utils/scaling';
import { Colors } from '../constants/Colors';
import { useFocusEffect } from '@react-navigation/native';

// ── Types ─────────────────────────────────────────────────────────────────────
type StatusTab  = 'All' | 'Completed' | 'Cancelled';
type DateFilter = 'This Week' | 'This Month' | 'Custom' | '';

interface HistoryItem {
  id:             string;
  orderId:        string;
  orderNumber:    string;
  type:           'food';
  status:         'Completed' | 'Cancelled' | 'Active';
  deliveryFee:    number;   // what driver earns
  amount:         number;   // order total (for context)
  serviceName:    string;   // e.g. "Food Delivery"
  pickupAddress:  string;
  dropoffAddress: string;
  restaurantName: string;
  customerName:   string;
  date:           string;
  time:           string;
  acceptedAt?:    string;
  deliveredAt?:   string;
  cancelledAt?:   string;
}

interface Summary {
  totalOrders:     number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalEarnings:   number;
}

const STATUS_TABS: StatusTab[] = ['All', 'Completed', 'Cancelled'];
const DATE_CHIPS:  DateFilter[] = ['This Week', 'This Month', 'Custom'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Completed: { color: '#22C55E', bg: '#22C55E18', icon: '✓' },
  Cancelled: { color: '#EF4444', bg: '#EF444418', icon: '✕' },
  Active:    { color: '#F59E0B', bg: '#F59E0B18', icon: '↻' },
};

const EMPTY_COPY: Record<StatusTab, { title: string; subtitle: string }> = {
  All:       { title: 'No orders yet',           subtitle: 'Your completed and cancelled orders will appear here.' },
  Completed: { title: 'No completed orders yet', subtitle: 'Your completed orders will appear here.' },
  Cancelled: { title: 'No cancelled orders yet', subtitle: 'Your cancelled orders will appear here.' },
};

const EMPTY_SUMMARY: Summary = { totalOrders: 0, deliveredOrders: 0, cancelledOrders: 0, totalEarnings: 0 };

// ── Screen ────────────────────────────────────────────────────────────────────
const HistoryScreen: React.FC = () => {
  const { getHistory } = useDriverFoodOrderService();

  const [tab,           setTab]           = useState<StatusTab>('All');
  const [dateFilter,    setDateFilter]    = useState<DateFilter>('');
  const [search,        setSearch]        = useState('');
  const [items,         setItems]         = useState<HistoryItem[]>([]);
  const [summary,       setSummary]       = useState<Summary>(EMPTY_SUMMARY);
  const [loading,       setLoading]       = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showCalendar,  setShowCalendar]  = useState<'from' | 'to' | null>(null);
  const [customFrom,    setCustomFrom]    = useState<Date | null>(null);
  const [customTo,      setCustomTo]      = useState<Date | null>(null);
  const [calMonth,      setCalMonth]      = useState(new Date());
  const [selectedItem,  setSelectedItem]  = useState<HistoryItem | null>(null);

  // ── Build query params ────────────────────────────────────────────────────
  const buildParams = useCallback((): Record<string, string> => {
    const p: Record<string, string> = {};

    // status
    if (tab === 'Completed') p.status = 'DELIVERED';
    if (tab === 'Cancelled') p.status = 'CANCELLED';

    // search
    if (search.trim()) p.search = search.trim();

    // date
    if (dateFilter === 'This Week')  p.filterBy = 'THIS_WEEK';
    if (dateFilter === 'This Month') p.filterBy = 'THIS_MONTH';
    if (dateFilter === 'Custom' && customFrom) {
      p.fromDate = customFrom.toISOString().split('T')[0];
      p.toDate   = (customTo ?? customFrom).toISOString().split('T')[0];
    }

    return p;
  }, [tab, search, dateFilter, customFrom, customTo]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getHistory(buildParams());
      const payload  = res?.data?.data ?? res?.data ?? res;
      setSummary(payload?.summary ?? EMPTY_SUMMARY);
      setItems(payload?.history ?? []);
    } catch (e: any) {
      console.error('[HistoryScreen] fetchHistory:', e?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams, getHistory]);

  // re-fetch on tab / date filter change
  useEffect(() => { fetchHistory(); }, [tab, dateFilter, customFrom, customTo]);

  // debounced search
  useEffect(() => {
    const t = setTimeout(fetchHistory, 400);
    return () => clearTimeout(t);
  }, [search]);

  useFocusEffect(useCallback(() => { fetchHistory(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
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
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  const isInRange = (d: Date) => {
    if (!customFrom) return false;
    const from = new Date(customFrom); from.setHours(0,0,0,0);
    const to   = customTo ? new Date(customTo) : new Date(customFrom); to.setHours(23,59,59,999);
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
      if (customFrom && day < customFrom) {
        setCustomFrom(day); setCustomTo(null); setShowCalendar('to');
      } else {
        setCustomTo(day); setShowCalendar(null);
      }
    }
  };

  // ── List header ───────────────────────────────────────────────────────────
  const ListHeader = (
    <>
      {/* KPI strip */}
      <View style={styles.kpiStrip}>
        {[
          { label: 'Orders',    value: summary.totalOrders,                                 color: Colors.primary },
          { label: 'Done',      value: summary.deliveredOrders,                             color: '#22C55E'      },
          { label: 'Cancelled', value: summary.cancelledOrders,                             color: '#EF4444'      },
          { label: 'Earned',    value: `$${Number(summary.totalEarnings).toFixed(0)}`,      color: Colors.black   },
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

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Order History</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order # or address"
            placeholderTextColor={Colors.Textgray}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearX}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Date chips */}
        <View style={styles.chipsRow}>
          {DATE_CHIPS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, dateFilter === c && styles.chipActive]}
              onPress={() => {
                if (c === 'Custom') {
                  setDateFilter('Custom');
                  setCustomFrom(null); setCustomTo(null);
                  setCalMonth(new Date());
                  setShowCalendar('from');
                } else {
                  setDateFilter(p => (p === c ? '' : c));
                }
              }}
            >
              <Text style={[styles.chipText, dateFilter === c && styles.chipTextActive]}>
                📅 {c === 'Custom' ? customLabel : c}
              </Text>
            </TouchableOpacity>
          ))}
          {dateFilter !== '' && (
            <TouchableOpacity
              style={styles.chipClear}
              onPress={() => { setDateFilter(''); setCustomFrom(null); setCustomTo(null); }}
            >
              <Text style={styles.chipClearText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status tabs */}
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

  // ── Row ───────────────────────────────────────────────────────────────────
  const renderRow = ({ item }: { item: HistoryItem }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Active;
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.card}
        onPress={() => setSelectedItem(item)}
      >
        {/* left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

        <View style={styles.cardInner}>

          {/* ── row 1: icon · order# + service badge · delivery fee ── */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: cfg.bg }]}>
              <Text style={styles.cardIconEmoji}>🍔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardOrderNo} numberOfLines={1}>{item.orderNumber}</Text>
              <View style={[styles.serviceBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.serviceBadgeText, { color: cfg.color }]}>{item.serviceName}</Text>
              </View>
            </View>
            <View style={styles.feeWrap}>
              <Text style={[styles.feeValue, {
                color: item.status === 'Completed' ? '#22C55E' : Colors.Textgray,
              }]}>
                {item.status === 'Cancelled' ? '—' : `$${item.deliveryFee.toFixed(2)}`}
              </Text>
              <Text style={styles.feeLabel}>Delivery Fee</Text>
            </View>
          </View>

          {/* ── row 2: restaurant · customer ── */}
          <View style={styles.metaRow}>
            {!!item.restaurantName && (
              <Text style={styles.metaText} numberOfLines={1}>🍴 {item.restaurantName}</Text>
            )}
            {!!item.restaurantName && <Text style={styles.metaDot}>·</Text>}
            {/* <Text style={styles.metaText} numberOfLines={1}>👤 {item.customerName}</Text> */}
          </View>

          {/* ── row 3: route ── */}
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
            </View>
            <View style={{ flex: 1, gap: scale(5) }}>
              <Text style={styles.routeAddr} numberOfLines={1}>
                {item.pickupAddress.split(',')[0] || '—'}
              </Text>
              <Text style={styles.routeAddr} numberOfLines={1}>
                {item.dropoffAddress.split(',')[0] || '—'}
              </Text>
            </View>
          </View>

          {/* ── row 4: status pill · date/time ── */}
          <View style={styles.cardFooter}>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.statusPillText, { color: cfg.color }]}>{item.status}</Text>
            </View>
            <Text style={styles.cardMeta}>🕐 {item.date}  ·  {item.time}</Text>
          </View>

        </View>
      </TouchableOpacity>
    );
  };

  // ── Detail bottom sheet ───────────────────────────────────────────────────
  const DetailSheet = (
    <BottomSheet visible={!!selectedItem} onClose={() => setSelectedItem(null)}>
      {selectedItem && (() => {
        const cfg = STATUS_CONFIG[selectedItem.status] ?? STATUS_CONFIG.Active;
        return (
          <ScrollView
          scrollEnabled
          contentContainerStyle={{
            maxHeight:vh(60)
          }} showsVerticalScrollIndicator={false}>
            {/* Status + order number */}
            <View style={styles.sheetStatusRow}>
              <View style={[styles.sheetBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.sheetBadgeText, { color: cfg.color }]}>{selectedItem.status}</Text>
              </View>
              <Text style={styles.sheetOrderNo}>{selectedItem.orderNumber}</Text>
            </View>

            {/* Amount */}
            <View style={styles.sheetAmountBox}>
              <Text style={styles.sheetAmountLabel}>Delivery Fee Earned</Text>
              <Text style={[styles.sheetAmountValue, { color: selectedItem.status === 'Completed' ? '#22C55E' : Colors.Textgray }]}>
                {selectedItem.status === 'Cancelled' ? '—' : `$${selectedItem.deliveryFee.toFixed(2)}`}
              </Text>
            </View>

            {/* Route */}
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>Route</Text>
              <View style={styles.sheetRouteCard}>
                <View style={styles.routeDots}>
                  <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
                  <View style={styles.routeLine} />
                  <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                </View>
                <View style={{ flex: 1, gap: scale(10) }}>
                  <View>
                    <Text style={styles.sheetAddrLabel}>Pickup</Text>
                    <Text style={styles.sheetAddrText}>{selectedItem.pickupAddress || '—'}</Text>
                  </View>
                  <View>
                    <Text style={styles.sheetAddrLabel}>Drop-off</Text>
                    <Text style={styles.sheetAddrText}>{selectedItem.dropoffAddress || '—'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Info rows */}
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>Details</Text>
              {([
                { label: 'Order #',      value: selectedItem.orderNumber },
                { label: 'Service',      value: selectedItem.serviceName },
                { label: 'Restaurant',   value: selectedItem.restaurantName },
                { label: 'Customer',     value: selectedItem.customerName },
                { label: 'Delivery Fee', value: selectedItem.status === 'Cancelled' ? '—' : `$${selectedItem.deliveryFee.toFixed(2)}` },
                { label: 'Order Total',  value: `$${selectedItem.amount.toFixed(2)}` },
                { label: 'Date',         value: selectedItem.date },
                { label: 'Time',         value: selectedItem.time },
                selectedItem.deliveredAt
                  ? { label: 'Delivered', value: new Date(selectedItem.deliveredAt).toLocaleString() }
                  : null,
                selectedItem.cancelledAt
                  ? { label: 'Cancelled', value: new Date(selectedItem.cancelledAt).toLocaleString() }
                  : null,
              ] as ({ label: string; value: string } | null)[])
                .filter(Boolean)
                .map(r => (
                  <View key={r!.label} style={styles.sheetInfoRow}>
                    <Text style={styles.sheetInfoLabel}>{r!.label}</Text>
                    <Text style={styles.sheetInfoValue} numberOfLines={2}>{r!.value || '—'}</Text>
                  </View>
                ))}
            </View>
          </ScrollView>
        );
      })()}
    </BottomSheet>
  );

  // ── Calendar bottom sheet ─────────────────────────────────────────────────
  const CalendarSheet = showCalendar ? (
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
          <TouchableOpacity
            style={styles.calMonthBtn}
            onPress={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <Text style={styles.calMonthArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calMonthLabel}>
            {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            style={styles.calMonthBtn}
            onPress={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            <Text style={styles.calMonthArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calWeekRow}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <Text key={i} style={styles.calWeekDay}>{d}</Text>
          ))}
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
                style={[
                  styles.calDayCell,
                  (isFrom || isTo) && styles.calDaySelected,
                  inRng && !isFrom && !isTo && styles.calDayInRange,
                ]}
                onPress={() => !isFut && handleDayPress(day)}
                disabled={isFut}
              >
                <Text style={[
                  styles.calDayText,
                  (isFrom || isTo) && styles.calDayTextSelected,
                  isFut && styles.calDayTextDisabled,
                ]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.calActions}>
          <TouchableOpacity
            style={styles.calCancelBtn}
            onPress={() => { setShowCalendar(null); if (!customFrom) setDateFilter(''); }}
          >
            <Text style={styles.calCancelText}>Cancel</Text>
          </TouchableOpacity>
          {showCalendar === 'to' && customFrom && (
            <TouchableOpacity
              style={styles.calDoneBtn}
              onPress={() => { setCustomTo(customFrom); setShowCalendar(null); }}
            >
              <Text style={styles.calDoneText}>Same Day</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeWrapper backgroundColor={Colors.bg}>
      <Header
        showBackButton={false}
        simpleHeaderTitle="History"
        showBadge={false}
        simpleHeader={true}
      />

      {loading && items.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderRow}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: scale(30) }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>{EMPTY_COPY[tab].title}</Text>
                <Text style={styles.emptySub}>{EMPTY_COPY[tab].subtitle}</Text>
              </View>
            ) : null
          }
        />
      )}

      {CalendarSheet}
      {DetailSheet}
    </SafeWrapper>
  );
};

export default HistoryScreen;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // KPI
  kpiStrip:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingVertical: scale(10), paddingHorizontal: vw(4), borderBottomWidth: 1, borderBottomColor: Colors.borderColor1 },
  kpiItem:    { flex: 1, alignItems: 'center' },
  kpiValue:   { fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(18), lineHeight: fontScale(22) },
  kpiLabel:   { fontFamily: 'Rubik-Regular', fontSize: fontScale(10), color: Colors.Textgray, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiDivider: { width: 1, height: scale(28), backgroundColor: Colors.borderColor2 },

  // Section header
  sectionHeader: { backgroundColor: Colors.white, paddingHorizontal: vw(4), paddingTop: scale(14), paddingBottom: scale(6) },
  sectionTitle:  { fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(18), color: Colors.black, marginBottom: scale(10) },

  // Search
  searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: scale(50), borderWidth: 1, borderColor: Colors.borderColor2, paddingHorizontal: scale(10), marginBottom: scale(10) },
  searchIcon:  { fontSize: fontScale(14), marginRight: scale(6) },
  searchInput: { flex: 1, fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.black, paddingVertical: scale(8) },
  clearX:      { fontSize: fontScale(13), color: Colors.Textgray, paddingLeft: scale(6) },

  // Chips
  chipsRow:       { flexDirection: 'row', gap: scale(8), marginBottom: scale(4), flexWrap: 'wrap' },
  chip:           { paddingHorizontal: scale(12), paddingVertical: scale(5), borderRadius: scale(20), borderWidth: 1, borderColor: Colors.borderColor2, backgroundColor: Colors.white },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.Textgray },
  chipTextActive: { color: Colors.white, fontFamily: 'Rubik-Medium' },
  chipClear:      { paddingHorizontal: scale(12), paddingVertical: scale(5), borderRadius: scale(20), backgroundColor: Colors.lightRed, borderWidth: 1, borderColor: Colors.secondaryDark },
  chipClearText:  { fontFamily: 'Rubik-Medium', fontSize: fontScale(11), color: Colors.secondaryDark },

  // Tabs
  tabsBar:       { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderColor1, paddingHorizontal: vw(4), gap: scale(20) },
  tabItem:       { paddingVertical: scale(10), position: 'relative' },
  tabText:       { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.Textgray },
  tabTextActive: { color: Colors.primary, fontFamily: 'Rubik-SemiBold' },
  tabUnderline:  { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: Colors.primary, borderRadius: 2 },

  // Card
  card:            { backgroundColor: Colors.white, marginHorizontal: vw(4), marginTop: scale(10), borderRadius: scale(14), overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, flexDirection: 'row' },
  cardAccent:      { width: scale(4), borderRadius: 0 },
  cardInner:       { flex: 1, padding: scale(12) },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(8) },
  cardIconWrap:    { width: scale(40), height: scale(40), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  cardIconEmoji:   { fontSize: fontScale(18) },
  cardOrderNo:     { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.black, marginBottom: scale(3) },
  serviceBadge:    { alignSelf: 'flex-start', paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(20) },
  serviceBadgeText:{ fontFamily: 'Rubik-Medium', fontSize: fontScale(10), letterSpacing: 0.3 },
  feeWrap:         { alignItems: 'flex-end' },
  feeValue:        { fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(17) },
  feeLabel:        { fontFamily: 'Rubik-Regular', fontSize: fontScale(9), color: Colors.Textgray, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginBottom: scale(8), flexWrap: 'wrap' },
  metaText:        { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.Textgray, flexShrink: 1 },
  metaDot:         { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.borderColor2 },
  restaurantLabel: { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.Textgray, marginBottom: scale(8) },

  // Route
  routeRow:  { flexDirection: 'row', gap: scale(10), marginBottom: scale(10), alignItems: 'center' },
  routeDots: { alignItems: 'center', gap: scale(3), paddingTop: scale(2) },
  routeDot:  { width: scale(8), height: scale(8), borderRadius: scale(4) },
  routeLine: { width: 1.5, height: scale(14), backgroundColor: Colors.borderColor2 },
  routeAddr: { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.black1 },

  // Card footer
  cardFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: scale(8), paddingTop: scale(8), borderTopWidth: 1, borderTopColor: Colors.borderColor1 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: scale(5), paddingHorizontal: scale(10), paddingVertical: scale(3), borderRadius: scale(20) },
  statusDot:      { width: scale(6), height: scale(6), borderRadius: scale(3) },
  statusPillText: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(11) },
  cardMeta:       { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.Textgray },
  detailsBtn:     { paddingHorizontal: scale(14), paddingVertical: scale(5), borderRadius: scale(20), backgroundColor: Colors.primary },
  detailsBtnText: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(11), color: Colors.white },
  customerChip:     { marginTop: scale(8), alignSelf: 'flex-start', backgroundColor: Colors.bg, borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: scale(3) },
  customerChipText: { fontFamily: 'Rubik-Regular', fontSize: fontScale(11), color: Colors.Textgray },

  // Detail sheet
  sheetStatusRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(12) },
  sheetBadge:       { paddingHorizontal: scale(12), paddingVertical: scale(4), borderRadius: scale(20) },
  sheetBadgeText:   { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(12), textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetOrderNo:     { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14), color: Colors.black },
  sheetAmountBox:   { backgroundColor: Colors.bg, borderRadius: scale(12), padding: scale(14), alignItems: 'center', marginBottom: scale(16) },
  sheetAmountLabel: { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.Textgray, marginBottom: scale(4) },
  sheetAmountValue: { fontFamily: 'Baloo2-ExtraBold', fontSize: fontScale(28) },
  sheetSection:     { marginBottom: scale(16) },
  sheetSectionTitle:{ fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.Textgray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: scale(8) },
  sheetRouteCard:   { flexDirection: 'row', gap: scale(12), backgroundColor: Colors.bg, borderRadius: scale(12), padding: scale(12) },
  sheetAddrLabel:   { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(10), color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: scale(2) },
  sheetAddrText:    { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.black1 },
  sheetInfoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: scale(9), borderBottomWidth: 1, borderBottomColor: Colors.borderColor1 },
  sheetInfoLabel:   { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.Textgray },
  sheetInfoValue:   { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.black, flex: 1, textAlign: 'right', marginLeft: scale(8) },

  // Calendar
  calOverlay:        { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 99, backgroundColor: 'rgba(0,0,0,0.4)' },
  calSheet:          { backgroundColor: Colors.white, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(16), paddingBottom: scale(32) },
  calHandle:         { width: scale(36), height: 4, borderRadius: 2, backgroundColor: Colors.borderColor2, alignSelf: 'center', marginBottom: scale(12) },
  calTitle:          { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(15), color: Colors.black, textAlign: 'center', marginBottom: scale(4) },
  calSubtitle:       { fontFamily: 'Rubik-Regular', fontSize: fontScale(12), color: Colors.Textgray, textAlign: 'center', marginBottom: scale(10) },
  calMonthRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(10) },
  calMonthBtn:       { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  calMonthArrow:     { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(22), color: Colors.black, lineHeight: fontScale(26) },
  calMonthLabel:     { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(14), color: Colors.black },
  calWeekRow:        { flexDirection: 'row', marginBottom: scale(4) },
  calWeekDay:        { flex: 1, textAlign: 'center', fontFamily: 'Rubik-Medium', fontSize: fontScale(11), color: Colors.Textgray },
  calGrid:           { flexDirection: 'row', flexWrap: 'wrap' },
  calDayCell:        { width: `${100 / 7}%` as any, height: scale(38), alignItems: 'center', justifyContent: 'center', borderRadius: scale(8) },
  calDaySelected:    { backgroundColor: Colors.primary },
  calDayInRange:     { backgroundColor: `${Colors.primary}22` },
  calDayText:        { fontFamily: 'Rubik-Medium', fontSize: fontScale(13), color: Colors.black },
  calDayTextSelected:{ color: Colors.white },
  calDayTextDisabled:{ color: Colors.borderColor2 },
  calActions:        { flexDirection: 'row', gap: scale(10), marginTop: scale(14) },
  calCancelBtn:      { flex: 1, paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: Colors.bg, alignItems: 'center' },
  calCancelText:     { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.black1 },
  calDoneBtn:        { flex: 1, paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: Colors.primary, alignItems: 'center' },
  calDoneText:       { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(13), color: Colors.white },

  // Empty state
  empty:     { alignItems: 'center', paddingTop: scale(60), gap: scale(8), paddingHorizontal: vw(10) },
  emptyIcon: { fontSize: fontScale(48) },
  emptyTitle:{ fontFamily: 'Rubik-SemiBold', fontSize: fontScale(16), color: Colors.black, textAlign: 'center' },
  emptySub:  { fontFamily: 'Rubik-Regular', fontSize: fontScale(13), color: Colors.Textgray, textAlign: 'center', lineHeight: fontScale(20) },
});
