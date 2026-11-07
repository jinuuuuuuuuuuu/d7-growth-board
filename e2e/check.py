"""전체 흐름 브라우저 시험. 사용: python e2e/check.py [기본 주소]"""
import re, sys, os
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/').rstrip('/') + '/#'
SH = os.environ.get('SHOTS', r'C:\Users\kevin\AppData\Local\Temp\claude\42ff6d1bfd5615cb\012eee5f-c7d1-4e35-a9d6-38d204b468d4\scratchpad\shots\app_')
res = []
def ok(n, c, d=''):
    res.append(bool(c)); print('PASS' if c else 'FAIL', n, d, flush=True)

def drag(pg, label, frac):
    """슬라이더를 전체 길이의 frac 지점으로 마우스 드래그"""
    el = pg.get_by_role('slider', name=label); el.scroll_into_view_if_needed(); b = el.bounding_box()
    val = float(el.input_value()); lo = float(el.get_attribute('min')); hi = float(el.get_attribute('max'))
    thumb = 11 + (b['width'] - 22) * (val - lo) / (hi - lo)
    pg.mouse.move(b['x'] + thumb, b['y'] + b['height'] / 2); pg.mouse.down()
    pg.mouse.move(b['x'] + 11 + (b['width'] - 22) * frac, b['y'] + b['height'] / 2, steps=12); pg.mouse.up(); pg.wait_for_timeout(120)
    return float(el.input_value())

def frac_of(pg, label, v):
    el = pg.get_by_role('slider', name=label); lo = float(el.get_attribute('min')); hi = float(el.get_attribute('max'))
    return (v - lo) / (hi - lo)

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(BASE + '/'); pg.wait_for_selector('text=전체 현황'); pg.wait_for_timeout(600)
    t = pg.inner_text('body')
    ok('대시보드 수치', '$161,176,025' in t and '$31,125,339' in t and '+19.3%' in t)
    ok('글꼴 Pretendard 로드', pg.evaluate("document.fonts.check('16px \"Pretendard Variable\"')"))
    pg.screenshot(path=SH + 'dash.png', full_page=True)
    pg.locator('label.field', has_text='위험 등급').locator('select').select_option('E'); pg.wait_for_timeout(200)
    ok('필터 E 등급 426개', '게임 목록 426개' in pg.inner_text('body'))
    pg.get_by_role('button', name='초기화').click()
    pg.get_by_label('게임 ID 검색').fill('008978'); pg.keyboard.press('Enter'); pg.wait_for_selector('text=왜 이렇게 판단했나요'); pg.wait_for_timeout(300)
    t = pg.inner_text('body')
    ok('검색 → 상세', 'REV4_008978' in t and '$89,753' in t and '83.3%' in t and '$168,156' in t and '$50,524' in t)
    ok('근거 요인', '−27.6%' in t and '−23.6%' in t and '+36.4%' in t)
    pg.screenshot(path=SH + 'game.png', full_page=True)
    pred = lambda: pg.get_by_test_id('sim-pred').inner_text()
    ok('슬라이더 5개', pg.get_by_role('slider').count() == 5, str(pg.get_by_role('slider').count()))
    # 자석: 현재값(56일) 근처로 끌면 현재값에 고정
    v = drag(pg, '업데이트 간격', frac_of(pg, '업데이트 간격', 59)); ok('자석: 59일 근처 → 현재 56일 고정', v == 56, str(v))
    ok('자석 상태 예측 불변', pred() == '$89,753', pred())
    v = drag(pg, '업데이트 간격', frac_of(pg, '업데이트 간격', 35)); ok('슬라이더: 35일 지점', v == 35, str(v))
    ok('업데이트 35일 → $117,487', pred() == '$117,487', pred())
    v = drag(pg, '충돌률', frac_of(pg, '충돌률', 3)); ok('슬라이더: 충돌률 3%', v == 3, str(v))
    ok('충돌률 3% 추가 → 약 $140,280', pred() == '$140,280', pred())
    v = drag(pg, '마케팅비 (비교 참고)', frac_of(pg, '마케팅비 (비교 참고)', 1.5)); ok('슬라이더: 마케팅 ×1.5', v == 1.5, str(v))
    ok('마케팅 안내문', '추가 집행의 효과는 아닙니다' in pg.inner_text('#sim'))
    v = drag(pg, '참여도 (하루 이용 시간)', frac_of(pg, '참여도 (하루 이용 시간)', 1.2)); ok('슬라이더: 참여도 ×1.2', v == 1.2, str(v))
    v = drag(pg, '앱 용량', frac_of(pg, '앱 용량', 175)); ok('슬라이더: 앱 175MB', v == 175, str(v))
    pg.screenshot(path=SH + 'sim.png', full_page=True)
    pg.get_by_role('slider', name='업데이트 간격').focus(); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(80)
    ok('키보드 한 단계 이동', float(pg.get_by_role('slider', name='업데이트 간격').input_value()) == 36)
    pg.get_by_role('button', name='현재값으로 되돌리기').click(); pg.wait_for_timeout(100)
    ok('되돌리기', pred() == '$89,753')
    # 게임군
    pg.goto(BASE + '/groups'); pg.wait_for_selector('text=비슷한 게임군 59개'); pg.wait_for_timeout(400)
    ok('게임군 59개, C03 기본', 'C03' in pg.inner_text('.cl.on'))
    pg.screenshot(path=SH + 'groups.png', full_page=True)
    pg.get_by_role('button', name='담기').first.click(); pg.wait_for_timeout(150)
    ok('담기 동작', pg.get_by_role('button', name='담음').count() == 1)
    pg.get_by_role('button', name=re.compile('C06')).click(); pg.wait_for_timeout(400)
    ok('다른 군집 전환', 'C06' in pg.inner_text('.cl.on'))
    # 보드
    pg.goto(BASE + '/board'); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='데모 포트폴리오 불러오기').click(); pg.wait_for_selector('text=이번 투입 계획'); pg.wait_for_timeout(500)
    t = pg.inner_text('body')
    plan = pg.locator('.plan').first.inner_text()
    ok('30인일 계획', all(k in plan.replace('\n', ' ') for k in ('002683', '007084', '008978')) and '$148,045' in t, plan[:90].replace('\n', ' '))
    ok('구조 검토 분리', '006953' in t and '구조 검토 대상' in t)
    pg.screenshot(path=SH + 'board.png', full_page=True)
    pg.get_by_label('REV4_003922 인일').fill('3'); pg.wait_for_timeout(200)
    ok('가정 수정 시 계획 변경', '003922' in pg.locator('.plan').first.inner_text())
    pg.get_by_label('REV4_003922 인일').fill('15'); pg.wait_for_timeout(100)
    # 카드
    pg.get_by_role('link', name='실험 카드 만들기').first.click(); pg.wait_for_selector('text=실험 카드 만들기'); pg.wait_for_timeout(500)
    vals = ' '.join(pg.locator('input, textarea').evaluate_all('e=>e.map(x=>x.value)'))
    ok('카드 채움, 치환 기호 없음', 'REV4_002683' in vals and not re.search(r'\{\w+\}', vals))
    pg.screenshot(path=SH + 'card_new.png', full_page=True)
    pg.get_by_role('button', name='저장').click(); pg.wait_for_timeout(400)
    ok('저장 후 목록', 'REV4_002683' in pg.inner_text('body') or '002683' in pg.inner_text('body'))
    pg.reload(); pg.wait_for_timeout(800)
    ok('새로고침 유지', '002683' in pg.inner_text('body'))
    pg.get_by_label('상태').first.select_option('진행'); pg.wait_for_timeout(150); pg.reload(); pg.wait_for_timeout(800)
    ok('상태 변경 유지', pg.get_by_label('상태').first.input_value() == '진행')
    pg.screenshot(path=SH + 'cards.png', full_page=True)
    # 0원 게임, 결측 게임
    pg.goto(BASE + '/game/REV4_006953'); pg.wait_for_selector('text=수익 경로 없음'); pg.get_by_role('link', name='구조 검토 실험 카드 만들기').click(); pg.wait_for_timeout(600)
    ok('0원 구조 카드', '수익 채널' in ' '.join(pg.locator('input, textarea').evaluate_all('e=>e.map(x=>x.value)')))
    pg.goto(BASE + '/game/REV4_005592'); pg.wait_for_selector('text=왜 이렇게 판단했나요'); pg.wait_for_timeout(200)
    ok('결측 경고, 마케팅 슬라이더 숨김', '약 1.7배' in pg.inner_text('body') and pg.get_by_role('slider').count() == 4, str(pg.get_by_role('slider').count()))
    # 리포트
    pg.goto(BASE + '/history'); pg.wait_for_selector('text=채널별 실제 매출 구성'); t = pg.inner_text('body')
    ok('과거 성과', '학습 게임의 실제 매출' in t and '$197,532' in t and '$121,475' in t)
    pg.screenshot(path=SH + 'history.png', full_page=True)
    pg.goto(BASE + '/method'); pg.wait_for_selector('text=위험 등급과 검증'); t = pg.inner_text('body')
    ok('방법과 한계', '0.6714' in t and '91.6%' in t and 'Car Rental' in t)
    pg.screenshot(path=SH + 'method.png', full_page=True)
    allt = ''
    for r in ('/', '/groups', '/board', '/cards', '/history', '/game/REV4_008978'):
        pg.goto(BASE + r); pg.wait_for_timeout(500); allt += pg.inner_text('body')
    ok('금지 표현 없음', not re.search(r'경쟁 게임|이익|반드시|NaN|undefined|null', allt), str(re.findall(r'경쟁 게임|이익|반드시|NaN|undefined|null', allt)[:4]))
    ok('콘솔 오류 없음', not errs, str(errs[:3]))
    # 휴대폰
    m = b.new_context(viewport={'width': 390, 'height': 800}, has_touch=True).new_page()
    for r, nm in (('/', 'm_dash'), ('/game/REV4_008978', 'm_game'), ('/board', 'm_board')):
        m.goto(BASE + r); m.wait_for_timeout(900)
        ok('휴대폰 가로 넘침 없음 ' + r, m.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), str(m.evaluate('document.documentElement.scrollWidth')))
        m.screenshot(path=SH + nm + '.png')
    b.close()
print('요약', sum(res), '/', len(res))
