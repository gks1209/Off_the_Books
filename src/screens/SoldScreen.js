import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import C from '../theme/colors';
import {
  fmt,
  fmtInput,
  stripCommas,
  toKRW,
  calcCostKRW,
} from '../utils/format';
import { useItemStore } from '../store/useItemStore';
import Label from '../components/Label';
import Field from '../components/Field';
import Btn from '../components/Btn';
import DropPicker from '../components/DropPicker';
import PriceField from '../components/PriceField';
import InfoRow from '../components/InfoRow';

const SELL_VIA_OPTIONS = ['번개장터', '후르츠패밀리'];

export function SoldScreen() {
  const items = useItemStore((state) => state.items);
  const exchangeRate = useItemStore((state) => state.exchangeRate);
  const updateItem = useItemStore((state) => state.updateItem);
  const deleteItem = useItemStore((state) => state.deleteItem);

  const sold = useMemo(() =>
    items.filter((i) => i.status === 'sold')
      .sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate)),
    [items]
  );

  const [expanded, setExpanded] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirm, setConfirm] = useState(null); // { title, message, onOk }

  const cost = (item) => calcCostKRW(item, exchangeRate);
  const profit = (item) => toKRW(item.soldPrice, item.soldCurrency || 'KRW', exchangeRate) - cost(item);

  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      soldDate: item.soldDate || '',
      soldVia: item.soldVia || '',
      soldPrice: item.soldPrice || '',
      soldCurrency: item.soldCurrency || 'KRW',
      deliveryName: item.deliveryName || '',
      deliveryAddr: item.deliveryAddr || '',
      deliveryPhone: item.deliveryPhone || '',
      trackingNum: item.trackingNum || '',
      sellerName: item.sellerName || '',
      sellerPhone: item.sellerPhone || '',
      sellerTrackingNum: item.sellerTrackingNum || '',
      isReceived: !!item.isReceived,
      costDuty: item.costDuty || '',
    });
  };

  const setEF = (key, val) => setEditForm((p) => ({ ...p, [key]: val }));

  const handleEditSave = async () => {
    if (!editForm.soldPrice) { Alert.alert('⚠️', '판매가를 입력해주세요.'); return; }
    const updated = { ...editTarget, ...editForm };
    await updateItem(updated);
    setEditTarget(null);
    setExpanded(null);
    Alert.alert('✅', '수정이 완료됐어요!');
  };

  const handleRevert = (item) => {
    setConfirm({
      title: '판매중으로 되돌리기',
      message: `"${item.name}"을(를) 판매중 상태로 \n되돌릴까요? 판매/배송 \n정보가 초기화됩니다.`,
      okLabel: '↩️ 되돌리기',
      okColor: C.gold,
      onOk: async () => {
        const reverted = {
          ...item,
          status: 'selling',
          soldDate: '', soldVia: '', soldPrice: '', soldCurrency: 'KRW',
          deliveryName: '', deliveryAddr: '', deliveryPhone: '', trackingNum: '',
        };
        await updateItem(reverted);
        setExpanded(null);
        setConfirm(null);
      },
    });
  };

  const handleDelete = (item) => {
    setConfirm({
      title: '삭제 확인',
      message: `"${item.name}"을(를) \n영구 삭제할까요? \n되돌릴 수 없어요.`,
      okLabel: '🗑 삭제',
      okColor: C.red,
      onOk: () => {
        deleteItem(item.id);
        setExpanded(null);
        setConfirm(null);
      },
    });
  };

  const renderItem = ({ item }) => {
    const isOpen = expanded === item.id;
    const p = profit(item);
    const soldCurr = item.soldCurrency || 'KRW';
    const buyCurr = item.buyCurrency || 'KRW';
    return (
      <View style={styles.itemCard}>
        <TouchableOpacity
          onPress={() => setExpanded(isOpen ? null : item.id)}
          activeOpacity={0.85}
        >
          <View style={styles.itemCardTop}>
            <View style={[styles.categoryBadge, { backgroundColor: C.green + '20', borderColor: C.green + '60' }]}>
              <Text style={[styles.categoryBadgeText, { color: C.green }]}>{item.category || '기타'}</Text>
            </View>
            <Text style={styles.itemCardDate}>{item.soldDate}</Text>
          </View>
          <Text style={styles.itemCardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.itemCardBottom}>
            <View>
              <Text style={styles.itemCardSub}>판매처: {item.soldVia || '-'}</Text>
              <Text style={styles.itemCardSub}>판매가: {fmt(item.soldPrice, soldCurr)}</Text>
            </View>
            <Text style={[styles.profitChip, { color: p >= 0 ? C.green : C.red, borderColor: p >= 0 ? C.green + '50' : C.red + '50' }]}>
              {p >= 0 ? '▲' : '▼'} {fmt(Math.abs(p), soldCurr)}
            </Text>
          </View>
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.expandedBox}>
            <Text style={styles.expandedTitle}>📬 배송 정보</Text>
            <InfoRow label="받는 사람" value={item.deliveryName} />
            <InfoRow label="주소" value={item.deliveryAddr} />
            <InfoRow label="연락처" value={item.deliveryPhone} />
            <InfoRow label="운송장" value={item.trackingNum} />
            <Text style={[styles.expandedTitle, { marginTop: 12 }]}>🛍️ 구매 & 판매자 정보</Text>
            <InfoRow label="판매자 이름" value={item.sellerName} />
            <InfoRow label="판매자 연락처" value={item.sellerPhone} />
            <InfoRow label="매입 운송장" value={item.sellerTrackingNum} />
            <InfoRow label="수령 여부" value={item.isReceived ? '📦 수령 완료' : '⏳ 수령 대기'} valueColor={item.isReceived ? C.blue : C.gold} />
            {Number(item.costDuty) > 0 ? (
              <InfoRow label="관세" value={fmt(item.costDuty)} />
            ) : null}
            <Text style={[styles.expandedTitle, { marginTop: 12 }]}>💸 수익 분석</Text>
            <InfoRow label="총 원가" value={fmt(cost(item), buyCurr)} />
            <InfoRow label="판매가" value={fmt(item.soldPrice, soldCurr)} />
            <InfoRow label="순수익" value={fmt(p, soldCurr)} valueColor={p >= 0 ? C.green : C.red} />

            <View style={styles.soldActionRow}>
              <TouchableOpacity
                style={[styles.soldActionBtn, { borderColor: C.accent + '80', backgroundColor: C.accent + '15' }]}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.soldActionBtnText, { color: C.accent }]}>✏️ 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.soldActionBtn, { borderColor: C.gold + '80', backgroundColor: C.gold + '15' }]}
                onPress={() => handleRevert(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.soldActionBtnText, { color: C.gold }]}>↩️ 되돌리기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.soldActionBtn, { borderColor: C.red + '80', backgroundColor: C.red + '15' }]}
                onPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.soldActionBtnText, { color: C.red }]}>🗑 삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <Text style={styles.pageTitle}>🏷️ 판매 완료 ({sold.length}개)</Text>
        {sold.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>아직 판매 완료된 상품이 없어요.</Text>
          </View>
        ) : (
          <FlatList
            data={sold}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      {/* 인앱 확인 모달 */}
      <Modal visible={!!confirm} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{confirm?.title}</Text>
            <Text style={styles.confirmMsg}>{confirm?.message}</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={() => setConfirm(null)}
              >
                <Text style={[styles.confirmBtnText, { color: C.textSec }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: confirm?.okColor + '20', borderColor: confirm?.okColor + '80' }]}
                onPress={confirm?.onOk}
              >
                <Text style={[styles.confirmBtnText, { color: confirm?.okColor }]}>{confirm?.okLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 수정 모달 */}
      <Modal visible={!!editTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                <Text style={styles.modalTitle}>✏️ 판매 정보 수정</Text>
                {editTarget && (
                  <View style={styles.modalItemSummary}>
                    <Text style={styles.modalItemName}>{editTarget.name}</Text>
                    <Text style={styles.modalItemCost}>총 원가: {fmt(cost(editTarget))}</Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>판매 정보</Text>
                <Field label="판매 날짜" value={editForm.soldDate} onChangeText={(v) => setEF('soldDate', v)} placeholder="YYYY-MM-DD" />
                <DropPicker
                  label="판매처"
                  value={editForm.soldVia}
                  onChange={(v) => setEF('soldVia', v)}
                  options={SELL_VIA_OPTIONS}
                  placeholder="판매처 선택"
                />
                <PriceField
                  label="판매가"
                  rawValue={editForm.soldPrice}
                  currency={editForm.soldCurrency || 'KRW'}
                  onChangeRaw={(v) => setEF('soldPrice', v)}
                  onChangeCurrency={(c) => setEF('soldCurrency', c)}
                  required
                />

                {editTarget && editForm.soldPrice ? (
                  <View style={styles.profitPreview}>
                    <Text style={styles.profitLabel}>수정 후 순수익</Text>
                    <Text style={[styles.profitValue, {
                      color: (Number(editForm.soldPrice) - cost(editTarget)) >= 0 ? C.green : C.red
                    }]}>
                      {fmt(Number(editForm.soldPrice) - cost(editTarget), editForm.soldCurrency || 'KRW')}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>배송 정보</Text>
                <Field label="받는 사람" value={editForm.deliveryName} onChangeText={(v) => setEF('deliveryName', v)} placeholder="홍길동" />
                <Field label="주소" value={editForm.deliveryAddr} onChangeText={(v) => setEF('deliveryAddr', v)} placeholder="서울시 강남구..." multiline />
                <Field label="연락처" value={editForm.deliveryPhone} onChangeText={(v) => setEF('deliveryPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
                <Field label="운송장 번호" value={editForm.trackingNum} onChangeText={(v) => setEF('trackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />

                <View style={styles.modalBtnRow}>
                  <Btn label="취소" onPress={() => setEditTarget(null)} variant="ghost" style={{ flex: 1, marginRight: 8 }} />
                  <Btn label="💾 저장" onPress={handleEditSave} variant="primary" style={{ flex: 2 }} />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  pageTitle: { color: C.textPri, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 20 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText: { color: C.textSec, fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { color: C.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  fieldWrap: { marginBottom: 14 },
  itemCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
  },
  itemCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryBadge: {
    backgroundColor: C.accent + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.accent + '60',
  },
  categoryBadgeText: { color: C.accent, fontSize: 11, fontWeight: '700' },
  itemCardDate: { color: C.textMuted, fontSize: 12 },
  itemCardName: { color: C.textPri, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  itemCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  itemCardSub: { color: C.textSec, fontSize: 12 },
  profitChip: {
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  expandedBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  expandedTitle: { color: C.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  soldActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  soldActionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  soldActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: C.textPri, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  modalItemSummary: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalItemName: { color: C.textPri, fontSize: 15, fontWeight: '700' },
  modalItemCost: { color: C.gold, fontSize: 13, marginTop: 2 },
  modalBtnRow: { flexDirection: 'row', marginTop: 16 },
  profitPreview: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  profitLabel: { color: C.textSec, fontSize: 13 },
  profitValue: { fontSize: 18, fontWeight: '800' },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmBox: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: C.border,
  },
  confirmTitle: { color: C.textPri, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  confirmMsg: { color: C.textSec, fontSize: 14, lineHeight: 22, marginBottom: 20 },
  confirmBtnRow: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },
});

export default SoldScreen;
