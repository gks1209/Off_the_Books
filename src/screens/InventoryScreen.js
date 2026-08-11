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
  StyleSheet,
} from 'react-native';
import C from '../theme/colors';
import {
  fmt,
  fmtInput,
  stripCommas,
  toKRW,
  todayStr,
  calcCostKRW,
} from '../utils/format';
import { useItemStore } from '../store/useItemStore';
import Label from '../components/Label';
import Field from '../components/Field';
import Btn from '../components/Btn';
import CategoryPicker from '../components/CategoryPicker';
import DropPicker from '../components/DropPicker';
import PriceField from '../components/PriceField';
import InfoRow from '../components/InfoRow';

const SELL_VIA_OPTIONS = ['번개장터', '후르츠패밀리'];
const BUY_FROM_OPTIONS = ['번개장터', '후르츠패밀리', 'ebay', '메루카리', 'Grailed'];

export function InventoryScreen() {
  const items = useItemStore((state) => state.items);
  const exchangeRate = useItemStore((state) => state.exchangeRate);
  const updateItem = useItemStore((state) => state.updateItem);
  const deleteItem = useItemStore((state) => state.deleteItem);

  const [saleTarget, setSaleTarget] = useState(null);  // 판매 모달 대상
  const [editTarget, setEditTarget] = useState(null);  // 수정 모달 대상
  const [confirm, setConfirm] = useState(null);        // 인앱 확인 모달 정보
  const [expanded, setExpanded] = useState(null);      // 확장 카드 id

  const [saleForm, setSaleForm] = useState({
    soldDate: todayStr(), soldVia: '', soldPrice: '', soldCurrency: 'KRW',
    deliveryName: '', deliveryAddr: '', deliveryPhone: '', trackingNum: '',
  });
  const [editForm, setEditForm] = useState({});

  const selling = useMemo(() =>
    items.filter((i) => i.status === 'selling')
      .sort((a, b) => new Date(b.buyDate) - new Date(a.buyDate)),
    [items]
  );

  const cost = (item) => calcCostKRW(item, exchangeRate);

  // ── 판매 모달
  const openSale = (item) => {
    setSaleTarget(item);
    setSaleForm({
      soldDate: todayStr(), soldVia: '', soldPrice: '', soldCurrency: 'KRW',
      deliveryName: '', deliveryAddr: '', deliveryPhone: '', trackingNum: ''
    });
  };
  const setF = (k, v) => setSaleForm((p) => ({ ...p, [k]: v }));

  const handleSold = async () => {
    if (!saleForm.soldPrice) {
      setConfirm({
        title: '⚠️',
        message: '판매가를 입력해주세요.',
        okLabel: '확인',
        okColor: C.accent,
        onOk: () => setConfirm(null)
      });
      return;
    }
    const updated = { ...saleTarget, status: 'sold', ...saleForm };
    await updateItem(updated);
    setSaleTarget(null);
  };

  // ── 수정 모달
  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      name: item.name, buyDate: item.buyDate, buyFrom: item.buyFrom || '',
      buyPrice: item.buyPrice, buyCurrency: item.buyCurrency || 'KRW',
      category: item.category || '',
      costWash: item.costWash || '', costRepair: item.costRepair || '', costShip: item.costShip || '',
      costDuty: item.costDuty || '',
      sellerName: item.sellerName || '',
      sellerPhone: item.sellerPhone || '',
      sellerTrackingNum: item.sellerTrackingNum || '',
      isReceived: !!item.isReceived,
    });
  };
  const setEF = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      setConfirm({
        title: '⚠️',
        message: '상품명을 입력해주세요.',
        okLabel: '확인',
        okColor: C.accent,
        onOk: () => setConfirm(null)
      });
      return;
    }
    const buyPriceKRW = toKRW(editForm.buyPrice, editForm.buyCurrency);
    const extraCostKRW = (Number(editForm.costWash) || 0) +
      (Number(editForm.costRepair) || 0) +
      (Number(editForm.costShip) || 0) +
      (Number(editForm.costDuty) || 0);
    const totalCostKRW = buyPriceKRW + extraCostKRW;

    await updateItem({ ...editTarget, ...editForm, totalCost: totalCostKRW });
    setEditTarget(null);
  };

  const handleToggleReceived = async (item) => {
    const updated = { ...item, isReceived: !item.isReceived };
    await updateItem(updated);
  };

  // ── 삭제
  const handleDelete = (item) => {
    setConfirm({
      title: '삭제 확인',
      message: `"${item.name}"을(를) \n삭제할까요?`,
      okLabel: '🗑 삭제', okColor: C.red,
      onOk: () => { deleteItem(item.id); setExpanded(null); setConfirm(null); },
    });
  };

  const renderItem = ({ item }) => {
    const isOpen = expanded === item.id;
    const buyCurr = item.buyCurrency || 'KRW';
    return (
      <View style={styles.itemCard}>
        <TouchableOpacity onPress={() => setExpanded(isOpen ? null : item.id)} activeOpacity={0.85}>
          <View style={styles.itemCardTop}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category || '기타'}</Text>
              </View>
              <View style={[styles.categoryBadge, { borderColor: item.isReceived ? C.blue + '60' : C.gold + '60', backgroundColor: item.isReceived ? C.blue + '15' : C.gold + '15' }]}>
                <Text style={[styles.categoryBadgeText, { color: item.isReceived ? C.blue : C.gold }]}>
                  {item.isReceived ? '📦 수령 완료' : '⏳ 수령 대기'}
                </Text>
              </View>
            </View>
            <Text style={styles.itemCardDate}>{item.buyDate}</Text>
          </View>
          <Text style={styles.itemCardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.itemCardBottom}>
            <View>
              <Text style={styles.itemCardSub}>구매처: {item.buyFrom || '-'}</Text>
              <Text style={styles.itemCardSub}>매입: {fmt(item.buyPrice, buyCurr)} | 토탈원가: {fmt(cost(item))}</Text>
            </View>
            <Text style={[styles.chip, { paddingVertical: 4, borderColor: C.accent + '60' }]}>
              <Text style={{ color: C.accent, fontSize: 11 }}>상세 보기 ▾</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.expandedBox}>
            <Text style={styles.expandedTitle}>🛍️ 구매 & 판매자 정보</Text>
            <InfoRow label="판매자 이름" value={item.sellerName} />
            <InfoRow label="판매자 연락처" value={item.sellerPhone} />
            <InfoRow label="매입 운송장" value={item.sellerTrackingNum} />
            <InfoRow label="수령 여부" value={item.isReceived ? '📦 수령 완료' : '⏳ 수령 대기'} valueColor={item.isReceived ? C.blue : C.gold} />
            {Number(item.costDuty) > 0 ? (
              <InfoRow label="관세" value={fmt(item.costDuty)} />
            ) : null}

            <View style={styles.soldActionRow}>
              <TouchableOpacity
                style={[styles.soldActionBtn, { borderColor: item.isReceived ? C.gold + '80' : C.blue + '80', backgroundColor: item.isReceived ? C.gold + '15' : C.blue + '15', flex: 1.5 }]}
                onPress={() => handleToggleReceived(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.soldActionBtnText, { color: item.isReceived ? C.gold : C.blue }]}>
                  {item.isReceived ? '⏳ 수령 대기로 변경' : '📦 수령 완료 처리'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.soldActionBtn, { borderColor: C.green + '80', backgroundColor: C.green + '15', flex: 1.5 }]}
                onPress={() => openSale(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.soldActionBtnText, { color: C.green }]}>💰 판매 완료 처리</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.soldActionBtn, { borderColor: C.accent + '80', backgroundColor: C.accent + '15', flex: 1 }]}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.soldActionBtnText, { color: C.accent }]}>✏️ 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.soldActionBtn, { borderColor: C.red + '80', backgroundColor: C.red + '15', flex: 1 }]}
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
        <Text style={styles.pageTitle}>📦 재고 목록 ({selling.length}개)</Text>
        {selling.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>재고가 모두 소진되었거나 없습니다.</Text>
          </View>
        ) : (
          <FlatList
            data={selling}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      {/* 판매 완료 처리 모달 */}
      <Modal visible={!!saleTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                <Text style={styles.modalTitle}>✅ 판매 완료 처리</Text>
                {saleTarget && (
                  <View style={styles.modalItemSummary}>
                    <Text style={styles.modalItemName}>{saleTarget.name}</Text>
                    <Text style={styles.modalItemCost}>총 원가 (KRW): {fmt(cost(saleTarget))}</Text>
                    {(saleTarget.buyCurrency || 'KRW') === 'USD' && (
                      <Text style={[styles.modalItemCost, { color: C.textMuted, fontSize: 12, marginTop: 2 }]}>
                        💱 매입가 ${saleTarget.buyPrice} × {exchangeRate.toLocaleString('ko-KR')}원 환산 적용
                      </Text>
                    )}
                  </View>
                )}

                <Text style={styles.sectionTitle}>판매 정보</Text>
                <Field label="판매 날짜" value={saleForm.soldDate} onChangeText={(v) => setF('soldDate', v)} placeholder="YYYY-MM-DD" />
                <DropPicker
                  label="판매처"
                  value={saleForm.soldVia}
                  onChange={(v) => setF('soldVia', v)}
                  options={SELL_VIA_OPTIONS}
                  placeholder="판매처 선택"
                />
                <PriceField
                  label="판매가"
                  rawValue={saleForm.soldPrice}
                  currency={saleForm.soldCurrency}
                  onChangeRaw={(v) => setF('soldPrice', v)}
                  onChangeCurrency={(c) => setF('soldCurrency', c)}
                  required
                />

                {saleTarget && saleForm.soldPrice && saleForm.soldCurrency === (saleTarget.buyCurrency || 'KRW') ? (
                  <View style={styles.profitPreview}>
                    <Text style={styles.profitLabel}>예상 수익</Text>
                    <Text style={[styles.profitValue, {
                      color: (Number(saleForm.soldPrice) - cost(saleTarget)) >= 0 ? C.green : C.red
                    }]}>
                      {fmt(Number(saleForm.soldPrice) - cost(saleTarget), saleForm.soldCurrency)}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>배송 정보</Text>
                <Field label="받는 사람" value={saleForm.deliveryName} onChangeText={(v) => setF('deliveryName', v)} placeholder="홍길동" />
                <Field label="주소" value={saleForm.deliveryAddr} onChangeText={(v) => setF('deliveryAddr', v)} placeholder="서울시 강남구..." multiline />
                <Field label="연락처" value={saleForm.deliveryPhone} onChangeText={(v) => setF('deliveryPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
                <Field label="운송장 번호" value={saleForm.trackingNum} onChangeText={(v) => setF('trackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />

                <View style={styles.modalBtnRow}>
                  <Btn label="취소" onPress={() => setSaleTarget(null)} variant="ghost" style={{ flex: 1, marginRight: 8 }} />
                  <Btn label="✅ 판매 완료" onPress={handleSold} variant="green" style={{ flex: 2 }} />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
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
                <Text style={styles.modalTitle}>✏️ 상품 정보 수정</Text>
                {editTarget && (
                  <View style={styles.modalItemSummary}>
                    <Text style={styles.modalItemName}>{editTarget.name}</Text>
                    <Text style={styles.modalItemCost}>총 원가: {fmt(cost(editTarget))}</Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>기본 정보</Text>
                <Field label="구매 날짜" value={editForm.buyDate} onChangeText={(v) => setEF('buyDate', v)} placeholder="YYYY-MM-DD" />
                <Field label="상품명 *" value={editForm.name} onChangeText={(v) => setEF('name', v)} placeholder="예: 리바이스 501 청바지" />
                <DropPicker
                  label="구매처"
                  value={editForm.buyFrom}
                  onChange={(v) => setEF('buyFrom', v)}
                  options={BUY_FROM_OPTIONS}
                  placeholder="구매처 선택"
                />
                <PriceField
                  label="매입가"
                  rawValue={editForm.buyPrice}
                  currency={editForm.buyCurrency || 'KRW'}
                  onChangeRaw={(v) => setEF('buyPrice', v)}
                  onChangeCurrency={(c) => setEF('buyCurrency', c)}
                  required
                />
                <CategoryPicker value={editForm.category} onChange={(v) => setEF('category', v)} />

                <Text style={styles.sectionTitle}>추가 비용 (KRW)</Text>
                <Field label="세탁비 (원)" value={fmtInput(editForm.costWash || '', 'KRW')} onChangeText={(v) => setEF('costWash', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                <Field label="수선비 (원)" value={fmtInput(editForm.costRepair || '', 'KRW')} onChangeText={(v) => setEF('costRepair', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                <Field label="택배비 (원)" value={fmtInput(editForm.costShip || '', 'KRW')} onChangeText={(v) => setEF('costShip', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                {(editForm.buyFrom === 'ebay' || editForm.buyFrom === 'Grailed') && (
                  <Field label="관세 (원)" value={fmtInput(editForm.costDuty || '', 'KRW')} onChangeText={(v) => setEF('costDuty', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                )}

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>구매 배송 및 판매자 정보</Text>
                <Field label="판매자 이름" value={editForm.sellerName} onChangeText={(v) => setEF('sellerName', v)} placeholder="예: 김철수" />
                <Field label="판매자 연락처" value={editForm.sellerPhone} onChangeText={(v) => setEF('sellerPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
                <Field label="매입 운송장 번호" value={editForm.sellerTrackingNum} onChangeText={(v) => setEF('sellerTrackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />
                <View style={styles.fieldWrap}>
                  <Label>수령 상태</Label>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, !editForm.isReceived && styles.chipActive]}
                      onPress={() => setEF('isReceived', false)}
                    >
                      <Text style={[styles.chipText, !editForm.isReceived && styles.chipTextActive]}>⏳ 수령 대기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, editForm.isReceived && styles.chipActive]}
                      onPress={() => setEF('isReceived', true)}
                    >
                      <Text style={[styles.chipText, editForm.isReceived && styles.chipTextActive]}>📦 수령 완료</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalBtnRow}>
                  <Btn label="취소" onPress={() => setEditTarget(null)} variant="ghost" style={{ flex: 1, marginRight: 8 }} />
                  <Btn label="💾 저장" onPress={handleEditSave} variant="primary" style={{ flex: 2 }} />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  chipText: { color: C.textSec, fontSize: 13 },
  chipTextActive: { color: C.white, fontWeight: '700' },
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

export default InventoryScreen;
