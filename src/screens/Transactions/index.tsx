import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SafeWrapper from '../../components/SafeWrapper';
import Header from '../../components/common/Header';
import { fontScale, scale, verticalScale, vh, vw } from '../../utils/scaling';
import { Colors } from '../../constants/Colors';
import useTransactions from '../../services/useTransactions';
import { useIsFocused } from '@react-navigation/native';

type Transaction = {
  _id: string;
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  balanceAfter: number;
  reason: string;
  status: string;
  createdAt: string;
  orderId?: string;
  transactionId?: string;
  breakdown?: {
    totalAmount: number;
    customerCommission: number;
    driverCommission: number;
    adminCommission: number;
    driverEarning: number;
  };
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    '  ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

const formatDateLocal = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function formatAmount(amount?: number | string | null) {
  const value = Number(amount ?? 0);
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

const getDateValue = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const SUMMARY_PAGE_WIDTH = vw(100) - scale(32);
const SUMMARY_CARD_GAP = scale(10);
const SUMMARY_CARD_WIDTH = (SUMMARY_PAGE_WIDTH - SUMMARY_CARD_GAP) / 2;

function reasonLabel(reason: string) {
  const map: Record<string, string> = {
    COMMISSION_DEBIT: 'DEBIT',
    TRIP_EARNING: 'Trip Earning',
    WALLET_TOPUP: 'Wallet Top-up',
    REFUND: 'Refund',
    WITHDRAWAL: 'Withdrawal',
    CANCEL_PENALTY: 'Cancellation Penalty',
  };
  return (
    map[reason] ??
    reason
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
  );
}

function TransactionCard({
  item,
  onPress,
}: {
  item: Transaction;
  onPress: () => void;
}) {
  const isCredit = item.transactionType === 'CREDIT';
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: isCredit ? '#E8F9F0' : '#FEF0EE' },
        ]}
      >
        <Text style={{ fontSize: fontScale(18) }}>{isCredit ? '↙' : '↗'}</Text>
      </View>

      <View style={styles.cardMiddle}>
        <Text
          style={[styles.reasonText, { color: isCredit ? 'green' : 'red' }]}
        >
          {reasonLabel(item.reason)}
        </Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.cardRight}>
        <Text
          style={[
            styles.amountText,
            { color: isCredit ? '#1DB05A' : Colors.secondaryDark },
          ]}
        >
          {isCredit ? '+' : '-'}${formatAmount(item.amount)}
        </Text>
        <Text style={styles.balanceText}>
          Bal: ${formatAmount(item.balanceAfter)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, valueColor ? { color: valueColor } : {}]}
      >
        {value}
      </Text>
    </View>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  amount,
  icon,
  color,
  bgColor,
}: {
  title: string;
  amount: number | string;
  icon: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bgColor }]}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryIcon}>{icon}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
      <Text style={[styles.summaryAmount, { color }]}>
        ${formatAmount(amount)}
      </Text>
    </View>
  );
}

export default function Transactions() {
  const { getTransactions, allTransactions, summary } = useTransactions();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterType, setFilterType] = useState<'CREDIT' | 'DEBIT' | ''>('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftFromDate, setDraftFromDate] = useState<Date | null>(null);
  const [draftToDate, setDraftToDate] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  const today = useMemo(() => new Date(), []);
  const hasDateFilter = !!fromDate || !!toDate;
  const dateFilterLabel = useMemo(() => {
    if (fromDate && toDate) {
      return `${formatDateLocal(fromDate)} - ${formatDateLocal(toDate)}`;
    }
    if (fromDate) {
      return formatDateLocal(fromDate);
    }
    if (toDate) {
      return formatDateLocal(toDate);
    }
    return 'Date';
  }, [fromDate, toDate]);
  const monthLabel = visibleMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    return [
      ...Array.from({ length: startOffset }, () => null),
      ...Array.from(
        { length: daysInMonth },
        (_, index) => new Date(year, month, index + 1),
      ),
    ];
  }, [visibleMonth]);

  // Summary comes directly from API — no manual calculation needed
  const summaryData = {
    totalCredit: summary.totalCredit,
    totalDebit: summary.totalDebit,
    totalCashReceive: summary.totalCashReceive,
    currentBalance: summary.currentBalance,
  };

  const isSameDay = (a?: Date | null, b?: Date | null) =>
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isDisabledDate = (date: Date) => {
    return getDateValue(date) > getDateValue(today);
  };

  const isDateInDraftRange = (date: Date) => {
    if (!draftFromDate || !draftToDate) return false;
    const dateValue = getDateValue(date);
    return (
      dateValue > getDateValue(draftFromDate) &&
      dateValue < getDateValue(draftToDate)
    );
  };

  const openDatePicker = () => {
    setDraftFromDate(fromDate);
    setDraftToDate(toDate);
    setVisibleMonth(fromDate ?? toDate ?? new Date());
    setIsDatePickerOpen(true);
  };

  const closeDatePicker = () => setIsDatePickerOpen(false);

  const handleDateSelect = (date: Date) => {
    if (!draftFromDate || draftToDate) {
      setDraftFromDate(date);
      setDraftToDate(null);
      return;
    }

    if (getDateValue(date) < getDateValue(draftFromDate)) {
      setDraftFromDate(date);
      return;
    }

    setDraftToDate(date);
    setFromDate(draftFromDate);
    setToDate(date);
    setIsDatePickerOpen(false);
  };

  const changeVisibleMonth = (direction: -1 | 1) => {
    setVisibleMonth(
      current =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await getTransactions({
        type: filterType || undefined,
        fromDate: fromDate ? formatDateLocal(fromDate) : undefined,
        toDate: toDate ? formatDateLocal(toDate) : undefined,
      });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }, [filterType, fromDate, getTransactions, toDate]);

  useEffect(() => {
    fetchTransactions();
  }, [filterType, fromDate, toDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const handleTypeFilter = (t: 'CREDIT' | 'DEBIT' | '') => {
    setFilterType(t);
  };

  const handleClearFilters = () => {
    setFilterType('');
    setFromDate(null);
    setToDate(null);
    setSearchQuery('');
  };

  // Filter transactions based on search query
  const getFilteredTransactions = useMemo(() => {
    if (!allTransactions) return [];

    let filtered = allTransactions as Transaction[];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const searchableFields = [
          item._id,
          item.transactionId,
          item.orderId,
          item.reason,
          item.transactionType,
          item.status,
          item.createdAt,
          item.amount?.toString(),
          item.balanceAfter?.toString(),
        ];

        return searchableFields.some(field =>
          field?.toLowerCase().includes(query),
        );
      });
    }

    return filtered;
  }, [allTransactions, searchQuery]);

  const hasFilters = filterType || hasDateFilter || searchQuery;

  return (
    <SafeWrapper>
      <View style={{ backgroundColor: Colors.cardBg }}>
        <Header simpleHeader simpleHeaderTitle="Transactions" showBackButton />
      </View>

      {isDatePickerOpen && (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={closeDatePicker}
        >
          <View style={styles.dateModalRoot}>
            <TouchableOpacity
              style={styles.dateOverlay}
              activeOpacity={1}
              onPress={closeDatePicker}
            />
            <View style={styles.dateSheet}>
              <View style={styles.dateSheetHeader}>
                <Text style={styles.dateSheetTitle}>Select Date Range</Text>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Text style={styles.dateSheetDone}>Close</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => changeVisibleMonth(-1)}
                >
                  <Text style={styles.monthButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => changeVisibleMonth(1)}
                >
                  <Text style={styles.monthButtonText}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.weekRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Text key={`${day}-${index}`} style={styles.weekText}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return (
                      <View key={`empty-${index}`} style={styles.dayCell} />
                    );
                  }

                  const isRangeStart = isSameDay(draftFromDate, date);
                  const isRangeEnd = isSameDay(draftToDate, date);
                  const isInRange = isDateInDraftRange(date);
                  const isDisabled = isDisabledDate(date);
                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[
                        styles.dayCell,
                        isInRange && styles.dayCellInRange,
                        (isRangeStart || isRangeEnd) && styles.dayCellSelected,
                      ]}
                      disabled={isDisabled}
                      onPress={() => handleDateSelect(date)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          (isRangeStart || isRangeEnd) &&
                            styles.dayTextSelected,
                          isDisabled && styles.dayTextDisabled,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}

      <FlatList
        data={getFilteredTransactions}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.scroll}
        style={styles.bg}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Summary Cards */}
            <ScrollView
              horizontal
              pagingEnabled
              snapToInterval={SUMMARY_PAGE_WIDTH}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryContainer}
            >
              <View style={styles.summaryPage}>
                <SummaryCard
                  title="Money added to driver wallet."
                  amount={summaryData.totalCredit}
                  icon="📈"
                  color="#1DB05A"
                  bgColor="#E8F9F0"
                />
                <SummaryCard
                  title="Money deducted from driver wallet.
"
                  amount={summaryData.totalDebit}
                  icon="📉"
                  color="#FF4444"
                  bgColor="#FEF0EE"
                />
              </View>
              <View style={styles.summaryPage}>
                <SummaryCard
                  title="Cash collected by the driver from customers."
                  amount={summaryData.totalCashReceive}
                  icon="💰"
                  color="#FF8C00"
                  bgColor="#FFF3E0"
                />
                <SummaryCard
                  title="Driver’s current wallet/deposit balance."
                  amount={summaryData.currentBalance}
                  icon="💳"
                  color="#4A90E2"
                  bgColor="#E3F2FD"
                />
              </View>
            </ScrollView>

            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search transaction or trip ID"
                  placeholderTextColor={Colors.Textgray}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchBtn}
                  >
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filters */}
            <View style={styles.filterWrapper}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterType === '' && styles.filterChipActive,
                  ]}
                  onPress={() => handleTypeFilter('')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterType === '' && styles.filterChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterType === 'CREDIT' && styles.filterChipActive,
                  ]}
                  onPress={() => handleTypeFilter('CREDIT')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterType === 'CREDIT' && styles.filterChipTextActive,
                    ]}
                  >
                    📈 Credit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterType === 'DEBIT' && styles.filterChipActive,
                  ]}
                  onPress={() => handleTypeFilter('DEBIT')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterType === 'DEBIT' && styles.filterChipTextActive,
                    ]}
                  >
                    📉 Debit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    styles.dateFilterChip,
                    hasDateFilter && styles.filterChipActive,
                  ]}
                  onPress={openDatePicker}
                  activeOpacity={0.8}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.filterChipText,
                      styles.dateFilterText,
                      hasDateFilter && styles.filterChipTextActive,
                    ]}
                  >
                    📅 {dateFilterLabel}
                  </Text>
                </TouchableOpacity>
                {hasFilters && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={handleClearFilters}
                  >
                    <Text style={styles.clearBtnText}>✕ Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.secondaryDark]}
            tintColor={Colors.secondaryDark}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>💳</Text>
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubText}>
              Trip payments, credits, and debits will appear here.
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TransactionCard item={item} onPress={() => setSelected(item)} />
        )}
      />

      {/* Detail Bottom Sheet */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        />

        {selected && (
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.handle} />

            {/* Header row */}
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.sheetIconCircle,
                  {
                    backgroundColor:
                      selected.transactionType === 'CREDIT'
                        ? '#E8F9F0'
                        : '#FEF0EE',
                  },
                ]}
              >
                <Text style={{ fontSize: fontScale(22) }}>
                  {selected.transactionType === 'CREDIT' ? '↙' : '↗'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {reasonLabel(selected.reason)}
                </Text>
                <Text style={styles.sheetDate}>
                  {formatDate(selected.createdAt)}
                </Text>
              </View>
              <Text
                style={[
                  styles.sheetAmount,
                  {
                    color:
                      selected.transactionType === 'CREDIT'
                        ? '#1DB05A'
                        : Colors.secondaryDark,
                  },
                ]}
              >
                {selected.transactionType === 'CREDIT' ? '+' : '-'}$
                {formatAmount(selected.amount)}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Info section */}
              <View style={styles.section}>
                <DetailRow
                  label="Status"
                  value={selected.status}
                  valueColor={selected.status == 'SUCCESS' ? 'green' : 'red'}
                />
                <View style={styles.divider} />
                {selected.orderId && (
                  <>
                    <DetailRow label="Order ID" value={selected.orderId} />
                    <View style={styles.divider} />
                  </>
                )}
                {selected.transactionId && (
                  <>
                    <DetailRow
                      label="Transaction ID"
                      value={selected.transactionId}
                    />
                    <View style={styles.divider} />
                  </>
                )}
                {selected.balanceAfter !== undefined &&
                  selected.balanceAfter !== null && (
                    <DetailRow
                      label="Balance After"
                      value={`$${formatAmount(selected.balanceAfter)}`}
                    />
                  )}
              </View>

              {/* Breakdown */}
              {selected.reason === 'CANCEL_PENALTY' && (
                <>
                  <Text style={styles.sectionLabel}>Cancellation Details</Text>
                  <View style={styles.section}>
                    <DetailRow
                      label="Penalty Charged"
                      value={`$${formatAmount(selected.amount)}`}
                      valueColor={Colors.secondaryDark}
                    />
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Deducted</Text>
                    <Text style={styles.totalValue}>
                      $
                      {formatAmount(
                        selected.breakdown?.totalAmount ?? selected.amount,
                      )}
                    </Text>
                  </View>
                </>
              )}

              {selected.reason !== 'WALLET_TOPUP' &&
                selected.reason !== 'CANCEL_PENALTY' && (
                  <>
                    <Text style={styles.sectionLabel}>Payment Breakdown</Text>

                    <View style={styles.section}>
                      <DetailRow
                        label="Trip Total (Paid by Customer)"
                        value={`$${formatAmount(
                          selected.breakdown?.totalAmount,
                        )}`}
                      />

                      <View style={styles.divider} />

                      <DetailRow
                        label="Customer Fee (Platform Commission)"
                        value={`$${formatAmount(
                          selected.breakdown?.customerCommission,
                        )}`}
                        valueColor={Colors.secondaryDark}
                      />

                      <View style={styles.divider} />

                      <DetailRow
                        label="Driver Fee (Platform Commission)"
                        value={`$${formatAmount(
                          selected.breakdown?.driverCommission,
                        )}`}
                        valueColor={Colors.secondaryDark}
                      />

                      <View style={styles.divider} />

                      <DetailRow
                        label="Driver Net Earnings"
                        value={`$${formatAmount(
                          selected.breakdown?.driverEarning,
                        )}`}
                        valueColor="#1DB05A"
                      />

                      <View style={styles.divider} />

                      <DetailRow
                        label="Total Deducted from Driver Wallet"
                        value={`$${formatAmount(
                          selected.breakdown?.adminCommission,
                        )}`}
                        valueColor={Colors.secondaryDark}
                      />
                    </View>
                  </>
                )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeWrapper>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.white },
  scroll: { padding: scale(16), paddingBottom: scale(40) },

  // Summary Cards
  summaryContainer: {
    paddingVertical: scale(12),
    maxHeight: scale(130),
  },
  summaryPage: {
    width: SUMMARY_PAGE_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: SUMMARY_CARD_WIDTH,
    height: scale(100),
    padding: scale(14),
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  summaryIcon: {
    fontSize: fontScale(16),
    marginRight: scale(4),
  },
  summaryTitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(11),
    color: Colors.Textgray,
    paddingHorizontal: scale(12),

  },
  summaryAmount: {
    fontFamily: 'Baloo2-ExtraBold',
    fontSize: fontScale(18),
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    backgroundColor: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: scale(50),
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    borderWidth: 1,
    borderColor: Colors.borderColor1,
  },
  searchIcon: {
    fontSize: fontScale(16),
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(14),
    color: Colors.black,
    paddingVertical: scale(4),
  },
  clearSearchBtn: {
    padding: scale(4),
  },
  clearSearchText: {
    fontSize: fontScale(14),
    color: Colors.Textgray,
  },

  // Filters
  filterWrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  filterChip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: Colors.borderColor2,
    backgroundColor: Colors.white,
    marginRight: scale(8),
    marginBottom: scale(8),
    maxWidth: SUMMARY_PAGE_WIDTH - scale(8),
  },
  dateFilterChip: {
    maxWidth: SUMMARY_PAGE_WIDTH - scale(8),
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(12),
    color: Colors.Textgray,
  },
  dateFilterText: {
    maxWidth: SUMMARY_PAGE_WIDTH - scale(42),
  },
  filterChipTextActive: {
    color: Colors.white,
    fontFamily: 'Rubik-Medium',
  },
  clearBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: Colors.lightRed,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
    marginRight: scale(8),
    marginBottom: scale(8),
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(12),
    color: Colors.secondaryDark,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(80),
    paddingHorizontal: scale(40),
  },
  emptyIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyIcon: {
    fontSize: fontScale(40),
  },
  emptyTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(18),
    color: Colors.black,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  emptySubText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(14),
    color: Colors.Textgray,
    textAlign: 'center',
    lineHeight: fontScale(20),
  },
  clearSearchButton: {
    marginTop: scale(20),
    paddingHorizontal: scale(24),
    paddingVertical: scale(10),
    backgroundColor: Colors.primary,
    borderRadius: scale(8),
  },
  clearSearchButtonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(14),
    color: Colors.white,
  },

  dateModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  dateSheet: {
    backgroundColor: Colors.white,
    paddingBottom: scale(14),
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dateSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor1,
  },
  dateSheetTitle: {
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(14),
    color: Colors.black,
  },
  dateSheetDone: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(13),
    color: Colors.primary,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
    paddingTop: scale(10),
    paddingBottom: scale(8),
  },
  monthButton: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  monthButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(24),
    color: Colors.black,
    lineHeight: fontScale(26),
  },
  monthLabel: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
    color: Colors.black,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(12),
    marginBottom: scale(4),
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(11),
    color: Colors.Textgray,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(12),
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: verticalScale(38),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(10),
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellInRange: {
    backgroundColor: Colors.primaryWithOpacity(0.1),
  },
  dayText: {
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(13),
    color: Colors.black,
  },
  dayTextSelected: {
    color: Colors.white,
  },
  dayTextDisabled: {
    color: Colors.borderColor2,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  iconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMiddle: { flex: 1 },
  reasonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: fontScale(13),
    color: Colors.black,
  },
  dateText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(11),
    color: Colors.Textgray,
    marginTop: scale(3),
  },
  cardRight: { alignItems: 'flex-end' },
  amountText: { fontFamily: 'Rubik-SemiBold', fontSize: fontScale(15) },
  balanceText: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(11),
    color: Colors.Textgray,
    marginTop: scale(3),
  },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(20),
    paddingBottom: scale(32),
    maxHeight: vh(78),
  },
  handle: {
    width: scale(40),
    height: scale(4),
    backgroundColor: '#D1D5DB',
    borderRadius: 100,
    alignSelf: 'center',
    marginBottom: scale(2),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(20),
    paddingBottom: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor1,
    marginTop: 23,
  },
  sheetIconCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
    color: Colors.black,
  },
  sheetDate: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(11),
    color: Colors.Textgray,
    marginTop: scale(2),
  },
  sheetAmount: {
    fontFamily: 'Baloo2-ExtraBold',
    fontSize: fontScale(20),
  },

  sectionLabel: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(12),
    color: Colors.Textgray,
    marginTop: scale(18),
    marginBottom: scale(8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: Colors.bg,
    borderRadius: scale(14),
    paddingHorizontal: scale(14),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  detailLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: fontScale(13),
    color: Colors.Textgray,
  },
  detailValue: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(13),
    color: Colors.black,
  },
  divider: { height: 1, backgroundColor: Colors.borderColor1 },

  // Total row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(12),
    backgroundColor: Colors.primary,
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  totalLabel: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
    color: Colors.white,
  },
  totalValue: {
    fontFamily: 'Baloo2-ExtraBold',
    fontSize: fontScale(18),
    color: Colors.white,
  },

  closeBtn: {
    backgroundColor: Colors.secondaryDark,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(16),
  },
  closeBtnText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: fontScale(14),
    color: Colors.white,
  },
});
