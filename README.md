# D7 성장 처방 보드

출시 후 7일차 지표로 이후 90일 매출의 위험과 개선 기회를 진단하고, 무엇부터 할지 정해 실험 카드로 저장하는 시제품입니다. 중앙대 DArt-B × 서강대 Parrot 연합 데이터톤 8팀 결과물입니다.

- 합성 데이터 기반이며 실제 시장 통계가 아닙니다.
- 모든 조정 시뮬레이션은 비슷한 게임끼리 비교한 연관 기반 추정입니다.
- 화면의 수치는 팀 최종 모델과 사전 분석에서 미리 계산한 값입니다.

## 실행

```
npm ci
npm run dev
```

브라우저 시험은 `npm run build`, `npx vite preview --port 4173` 뒤 `python e2e/check.py`로 실행합니다.

## 출처

- 화면 구성: Mahmud Saeef, Car Rental Company Dashboard UI (Figma Community, 교육 목적 무료)
- 글꼴: Pretendard (SIL Open Font License, `public/fonts/Pretendard-LICENSE.txt`)
