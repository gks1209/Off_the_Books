import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import C from '../theme/colors';
import { fmt, isSameMonth, toKRW, calcCostKRW } from '../utils/format';
import { useItemStore } from '../store/useItemStore';

export function DashboardScreen() {
  const items = useItemStore((state) => state.items);

  const stats = useMemo(() => {
    const soldThisMonth = items.filter(
      (i) => i.status === 'sold' && isSameMonth(i.soldDate)
    );
    const totalRevenue = soldThisMonth.reduce(
      (a, i) => a + toKRW(i.soldPrice, i.soldCurrency || 'KRW'), 0
    );
    const totalCost = soldThisMonth.reduce((a, i) => a + calcCostKRW(i), 0);
    const netProfit = totalRevenue - totalCost;

    const unsold = items.filter((i) => i.status === 'selling');
    const inventoryValue = unsold.reduce((a, i) => a + calcCostKRW(i), 0);
    return { totalRevenue, netProfit, inventoryValue, unsoldCount: unsold.length, soldCount: soldThisMonth.length };
  }, [items]);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const StatCard = ({ emoji, label, value, color }) => (
    <View style={[styles.statCard, { borderColor: color + '55' }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{fmt(value)}</Text>
    </View>
  );

  const recentSold = items
    .filter((i) => i.status === 'sold')
    .sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate))
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 헤더 */}
        <View style={styles.dashHeader}>
          <Text style={styles.dashBrand}>📖 Off the Books</Text>
          <Text style={styles.dashMonth}>{monthLabel} 리포트</Text>
        </View>

        {/* 통계 카드 3개 */}
        <StatCard emoji="💰" label="이번 달 총 매출" value={stats.totalRevenue} color={C.gold} />
        <StatCard emoji="📈" label="이번 달 순이익" value={stats.netProfit} color={C.green} />
        <StatCard emoji="📦" label="현재 재고 총 가치" value={stats.inventoryValue} color={C.accent} />

        {/* 요약 뱃지 */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeNum}>{stats.unsoldCount}</Text>
            <Text style={styles.badgeLabel}>판매중</Text>
          </View>
          <View style={[styles.badge, { borderColor: C.green + '55' }]}>
            <Text style={[styles.badgeNum, { color: C.green }]}>{stats.soldCount}</Text>
            <Text style={styles.badgeLabel}>이달 판매완료</Text>
          </View>
        </View>

        {/* 최근 판매 */}
        {recentSold.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 최근 판매</Text>
            {recentSold.map((item) => (
              <View key={item.id} style={styles.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.recentSub}>{item.soldDate} · {item.soldVia}</Text>
                </View>
                <Text style={[styles.recentPrice, { color: C.gold }]}>{fmt(item.soldPrice)}</Text>
              </View>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🏷️</Text>
            <Text style={styles.emptyText}>아직 등록된 상품이 없어요.</Text>
            <Text style={styles.emptyHint}>하단 ＋ 버튼으로 상품을 등록해보세요!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  dashHeader: { paddingVertical: 20, alignItems: 'center' },
  dashBrand: { color: C.textPri, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  dashMonth: { color: C.textSec, fontSize: 13, marginTop: 4 },
  statCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  statEmoji: { fontSize: 28, marginBottom: 6 },
  statLabel: { color: C.textSec, fontSize: 13, marginBottom: 4 },
  statValue: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  badge: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accent + '55',
    paddingVertical: 14,
    alignItems: 'center',
  },
  badgeNum: { color: C.accent, fontSize: 28, fontWeight: '800' },
  badgeLabel: { color: C.textSec, fontSize: 12, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { color: C.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  recentName: { color: C.textPri, fontSize: 14, fontWeight: '600' },
  recentSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  recentPrice: { fontSize: 15, fontWeight: '700' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText: { color: C.textSec, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: C.textMuted, fontSize: 13, marginTop: 6 },
});

export default DashboardScreen;
