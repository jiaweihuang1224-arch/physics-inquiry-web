import { MODEL, installation, visibleBodyRange, rayForReflection, controlLimits } from "./mirror-physics.js";

let mountSequence = 0;
const COPY = {
  title: ["照见全身：镜子要多长，挂多高？", "Seeing your whole body: mirror size and position"],
  subtitle: ["调节镜面位置，观察可见范围，再用光路和相似三角形说明结果。", "Adjust the mirror, observe what is visible, then explain it with rays and similar triangles."],
  back: ["返回题页", "Back to question"],
  viewQuestion: ["查看题目", "View question"],
  hideQuestion: ["收起题目", "Hide question"],
  questionLead: ["课堂演示中，一名身高 78 cm、眼睛离地 70 cm 的学生站在竖直平面镜前 60 cm 处；镜子下缘恰好使她能看见鞋尖。", "For a classroom demonstration, a student of height 78 cm and eye level 70 cm stands 60 cm from a vertical plane mirror; its lower edge is set so the student can just see their shoes."],
  questionA: ["镜子下缘离地多高？", "How high above the ground is the lower edge of the mirror?"],
  questionB: ["若她刚好能在镜中看见全身，镜子的最短长度是多少？", "If she can just see her whole body in the mirror, what is the minimum mirror length?"],
  reset: ["恢复初始", "Reset starting values"],
  sceneTitle: ["有限平面镜 · 侧视几何图", "Finite plane mirror · side-view geometry"],
  sceneAria: ["女孩、镜子、虚像与反射光路的侧视图", "Side view of the girl, mirror, virtual image and reflected rays"],
  sceneDescription: ["女孩与镜子保持同一尺度；镜后淡色轮廓是等大虚像。", "The girl and mirror use one scale; the pale outline behind the mirror is an equal-size virtual image."],
  statusNoRange: ["镜中暂无可见范围", "Nothing is visible in the mirror"],
  statusShorter: ["全身可见 · 镜子仍可缩短", "Whole body visible · the mirror can be shorter"],
  statusShortest: ["全身可见 · 已达到最短镜长", "Whole body visible · minimum mirror length reached"],
  statusHead: ["头顶可见 · 脚部不可见", "Top of head visible · feet are not"],
  statusFeet: ["脚部可见 · 头顶不可见", "Feet visible · top of head is not"],
  statusNeither: ["头顶与脚部均不可见", "Neither the top of the head nor the feet are visible"],
  visiblePrefix: ["可见身体高度", "Visible body height"],
  noVisibleRange: ["无", "none"],
  fullImageLegend: ["淡色轮廓为完整虚像，较深部分是当前可见范围", "The pale outline is the full virtual image; the darker part is currently visible"],
  rayLegend: ["实线箭头表示真实光路", "Solid arrows show real light paths"],
  referenceNote: ["相似三角形参考，当前镜位保留", "Triangle reference only; current mirror position is unchanged"],
  proofsTitle: ["相似三角形", "Similar triangles"],
  lowerCardTitle: ["下缘高度", "Lower-edge height"],
  lowerCardEquation: ["ΔF′OP ∼ ΔF′FE", "ΔF′OP ∼ ΔF′FE"],
  lowerCardAria: ["切换下缘高度相似三角形参考", "Toggle the lower-edge triangle reference"],
  lowerResult: ["b = 35 cm", "b = 35 cm"],
  lowerMeaning1: ["OP = 35 cm", "OP = 35 cm"],
  lowerMeaning2: ["FE = 70 cm", "FE = 70 cm"],
  upperCardTitle: ["最短镜长", "Minimum mirror length"],
  upperCardEquation: ["ΔEPQ ∼ ΔEF′T′", "ΔEPQ ∼ ΔEF′T′"],
  upperCardAria: ["切换最短镜长相似三角形参考", "Toggle the minimum-length triangle reference"],
  upperResult: ["L = 39 cm", "L = 39 cm"],
  upperTop: ["上缘 = 74 cm", "Top edge = 74 cm"],
  upperMeaning1: ["PQ = 39 cm", "PQ = 39 cm"],
  upperMeaning2: ["F′T′ = 78 cm", "F′T′ = 78 cm"],
  proofHint: ["点击卡片，在主图中查看对应的几何参考。", "Select a card to highlight its geometric reference in the main diagram."],
  explain: ["解题说明", "Solution"],
  hideExplain: ["收起说明", "Hide solution"],
  explainHeading1: ["确定镜子下缘", "Finding the lower edge"],
  explainText1: ["脚底的虚像 F′(−d, 0) 与眼睛 E(d, 70) 的连线在镜面上交于 P；O 是镜面与地面的交点。由 ΔF′OP ∼ ΔF′FE，b/70 = d/(2d) = 1/2，因此 b = 35 cm。", "The line from the virtual image of the shoes F′(−d, 0) to the eye E(d, 70) meets the mirror at P; O is where the mirror meets the ground. Since ΔF′OP ∼ ΔF′FE, b/70 = d/(2d) = 1/2, so b = 35 cm."],
  explainHeading2: ["确定最短镜长", "Finding the minimum length"],
  explainText2: ["眼睛 E(d, 70) 与头顶虚像 T′(−d, 78) 的连线和镜面相交于 Q。由 ΔEPQ ∼ ΔEF′T′，L/78 = d/(2d) = 1/2，因此 L = 39 cm，上缘为 35 + 39 = 74 cm。", "Join the eye E(d, 70) to the virtual image of the top of the head T′(−d, 78); the line meets the mirror at Q. Since ΔEPQ ∼ ΔEF′T′, L/78 = d/(2d) = 1/2, so L = 39 cm and the top edge is 35 + 39 = 74 cm."],
  conclusion: ["在本例的一面竖直平面镜模型中，最短镜长是身高的一半，与人镜距离无关。", "For this single vertical plane-mirror model, the minimum mirror length is half the person’s height, independent of distance."],
  controlTitle: ["调整实验条件", "Adjust the experiment"],
  distance: ["人与镜距离", "Person–mirror distance"],
  bottom: ["镜子离地", "Mirror lower-edge height"],
  length: ["镜子长度", "Mirror length"],
  cm: ["厘米", "centimeters"],
  toggleLight: ["光路显示", "Show light paths"],
  toggleLightOff: ["关闭光路显示", "Hide light paths"],
  topLimit: ["镜面上缘不高于 95 cm", "Mirror top is limited to 95 cm"],
  localNote: ["模型范围：一面竖直平面镜与几何光路；不直接推广到曲面镜、多面镜或其他题型。", "Model scope: one vertical plane mirror with geometrical rays; do not generalize directly to curved or multiple mirrors or other problem types."],
  resetAria: ["恢复自由探索初始值：距离 60 cm、下缘 40 cm、镜长 40 cm", "Reset to the free-exploration start: distance 60 cm, lower edge 40 cm, length 40 cm"],
  questionToggleAria: ["展开或收起实验题目", "Expand or collapse the experiment question"],
  solutionToggleAria: ["展开或收起解题说明", "Expand or collapse the solution"],
  bottomRangeAria: ["镜子下缘离地高度", "Mirror lower-edge height above ground"],
  lengthRangeAria: ["镜子长度", "Mirror length"],
  distanceRangeAria: ["人与镜面的水平距离", "Horizontal distance from person to mirror"],
  lowerMiniAria: ["下缘高度相似三角形：大三角形 F′FE 与小三角形 F′OP", "Lower-edge triangles: large triangle F′FE and small triangle F′OP"],
  upperMiniAria: ["最短镜长相似三角形：大三角形 EF′T′ 与小三角形 EPQ", "Minimum-length triangles: large triangle EF′T′ and small triangle EPQ"]
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function miniTriangleMarkup(kind, ariaLabel) {
  if (kind === "lower") {
    return `
      <svg class="mlab-mini-diagram" viewBox="0 0 250 165" role="img" aria-label="${escapeHtml(ariaLabel)}">
        <path class="mini-edge" d="M54 140 L54 59.5 L192 140 Z"/>
        <path class="mini-edge-small" d="M123 140 L123 99.75 L192 140 Z"/>
        <circle class="mini-vertex" cx="54" cy="140" r="3.4"/><circle class="mini-vertex" cx="54" cy="59.5" r="3.4"/>
        <circle class="mini-vertex" cx="123" cy="140" r="3.1"/><circle class="mini-vertex" cx="123" cy="99.75" r="3.1"/><circle class="mini-vertex" cx="192" cy="140" r="3.4"/>
        <text x="43" y="57">E</text><text x="42" y="158">F</text><text x="123" y="158" text-anchor="middle">O</text>
        <text x="130" y="98">P</text><text x="198" y="158">F′</text><text x="42" y="103">70 cm</text><text x="130" y="126">b</text>
      </svg>`;
  }
  return `
    <svg class="mlab-mini-diagram" viewBox="0 0 250 165" role="img" aria-label="${escapeHtml(ariaLabel)}">
      <path class="mini-edge" d="M54 59.5 L192 140 L192 50.3 Z"/>
      <path class="mini-edge-small" d="M54 59.5 L123 99.75 L123 54.9 Z"/>
      <circle class="mini-vertex" cx="54" cy="59.5" r="3.4"/><circle class="mini-vertex" cx="123" cy="99.75" r="3.1"/>
      <circle class="mini-vertex" cx="123" cy="54.9" r="3.1"/><circle class="mini-vertex" cx="192" cy="140" r="3.4"/><circle class="mini-vertex" cx="192" cy="50.3" r="3.4"/>
      <text x="43" y="76">E</text><text x="130" y="53">Q</text><text x="130" y="116">P</text>
      <text x="198" y="49">T′</text><text x="198" y="158">F′</text><text x="130" y="82">L</text><text x="209" y="97">78 cm</text>
    </svg>`;
}

export function mountMirrorLab(container, { lang = "zh", onBack } = {}) {
  if (!container || typeof container.appendChild !== "function") throw new TypeError("mountMirrorLab requires a container element.");

  const id = "mirror-lab-" + (++mountSequence);
  const state = {
    lang: lang === "en" ? "en" : "zh",
    d: MODEL.distance, b: MODEL.bottom, L: MODEL.length,
    selected: null, lightOn: true, questionOpen: false, solutionOpen: false
  };
  const text = (key) => (COPY[key] || [key, key])[state.lang === "en" ? 1 : 0];
  const root = document.createElement("section");
  root.className = "mirror-lab";
  root.setAttribute("aria-labelledby", id + "-title");
  const svgMarkup = `
    <svg class="mlab-scene-svg" viewBox="100 270 970 520" role="img" aria-label="${escapeHtml(text("sceneAria"))}" xmlns="http://www.w3.org/2000/svg">
      <title data-i18n="sceneAria">${escapeHtml(text("sceneAria"))}</title>
      <desc data-i18n="sceneDescription">${escapeHtml(text("sceneDescription"))}</desc>
      <defs>
        <linearGradient id="${id}-mirror" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#718b98" stop-opacity=".70"/><stop offset=".15" stop-color="#eff8f8" stop-opacity=".94"/>
          <stop offset=".52" stop-color="#c7dbe2" stop-opacity=".75"/><stop offset=".88" stop-color="#f6fbfb" stop-opacity=".93"/>
          <stop offset="1" stop-color="#718997" stop-opacity=".72"/>
        </linearGradient>
        <pattern id="${id}-etch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(26)"><path d="M0 0v5" stroke="#58717c" stroke-width=".65" opacity=".32"/></pattern>
        <clipPath id="${id}-top-clip" clipPathUnits="userSpaceOnUse"><rect x="0" y="384" width="1200" height="36"/></clipPath>
        <clipPath id="${id}-lower-clip" clipPathUnits="userSpaceOnUse"><rect x="0" y="420" width="1200" height="315"/></clipPath>
        <clipPath id="${id}-visible-clip" clipPathUnits="userSpaceOnUse"><rect id="${id}-visible-rect" x="0" y="420" width="1200" height="315"/></clipPath>
        <g id="${id}-girl-artwork">
          <g clip-path="url(#${id}-top-clip)"><image href="./assets/girl.png" x="0" y="0" width="1024" height="1536" transform="matrix(0.25039746 0 0 0.21428571 164.73768 370.285714)" preserveAspectRatio="none"/></g>
          <g clip-path="url(#${id}-lower-clip)"><image href="./assets/girl.png" x="0" y="0" width="1024" height="1536" transform="matrix(0.25039746 0 0 0.25039746 164.73768 361.90779)" preserveAspectRatio="none"/></g>
        </g>
      </defs>
      <path d="M105 735H1065" stroke="#6c7f88" stroke-width="1.2" opacity=".67"/><path d="M105 738H1065" stroke="#adaba2" stroke-width="2" opacity=".31"/>
      <ellipse id="${id}-real-shadow" cx="330" cy="737" rx="39" ry="5" fill="#667985" opacity=".13"/><ellipse id="${id}-virtual-shadow" cx="870" cy="737" rx="39" ry="5" fill="#667985" opacity=".065"/>
      <g id="${id}-triangle-overlay" style="display:none">
        <polygon id="${id}-triangle-large" fill="#d9a14a" fill-opacity=".14" stroke="#b68a4c" stroke-opacity=".56" stroke-width="1.5"/>
        <polygon id="${id}-triangle-small" fill="#6fa9d0" fill-opacity=".18" stroke="#4f8db9" stroke-opacity=".72" stroke-width="1.65"/>
      </g>
      <g id="${id}-virtual-full" transform="translate(1200 0) scale(-1 1)" opacity=".08"><use id="${id}-virtual-full-art" href="#${id}-girl-artwork"/></g>
      <g id="${id}-virtual-visible" clip-path="url(#${id}-visible-clip)" opacity=".30"><g transform="translate(1200 0) scale(-1 1)"><use id="${id}-virtual-visible-art" href="#${id}-girl-artwork"/></g></g>
      <use id="${id}-real-girl" href="#${id}-girl-artwork"/>
      <g id="${id}-virtual-rays" fill="none" stroke="#647e91" stroke-width="1.5" stroke-dasharray="5 6" stroke-linecap="round" opacity=".72">
        <line id="${id}-virtual-foot-ray"/><line id="${id}-virtual-head-ray"/>
      </g>
      <g id="${id}-real-rays" fill="none" stroke="#2567a5" stroke-width="2" stroke-linecap="round">
        <line id="${id}-foot-in"/><line id="${id}-foot-out"/><line id="${id}-head-in"/><line id="${id}-head-out"/>
        <path id="${id}-foot-in-arrow" d="M-5 -4L4 0-5 4Z" fill="#2567a5" stroke="none"/>
        <path id="${id}-foot-out-arrow" d="M-5 -4L4 0-5 4Z" fill="#2567a5" stroke="none"/>
        <path id="${id}-head-in-arrow" d="M-5 -4L4 0-5 4Z" fill="#2567a5" stroke="none"/>
        <path id="${id}-head-out-arrow" d="M-5 -4L4 0-5 4Z" fill="#2567a5" stroke="none"/>
      </g>
      <g id="${id}-mirror">
        <rect id="${id}-mirror-face" x="596" y="577.5" width="8" height="180" rx="1.2" fill="url(#${id}-mirror)" stroke="#718894" stroke-width=".9"/>
        <rect id="${id}-mirror-etch" x="596" y="577.5" width="2" height="180" fill="url(#${id}-etch)" opacity=".78"/>
        <path id="${id}-mirror-shine" d="M598.2 579v175 M602.7 579v175" stroke="#fff" stroke-opacity=".66" stroke-width=".8"/>
        <path id="${id}-mirror-cap" d="M595 577.5h10 M595 757.5h10" fill="none" stroke="#667e89" stroke-width=".8" opacity=".76"/>
      </g>
      <g id="${id}-points" fill="#245e98" stroke="#fffdf8" stroke-width="2">
        <circle id="${id}-point-f" cx="330" cy="735" r="5"/><circle id="${id}-point-e" cx="330" cy="420" r="5"/><circle id="${id}-point-t" cx="330" cy="384" r="5.2"/>
        <circle id="${id}-point-o" cx="600" cy="735" r="4.4" style="display:none"/>
        <circle id="${id}-point-p" class="reflection-dot" cx="600" cy="577.5" r="5.1"/><circle id="${id}-point-q" class="reflection-dot" cx="600" cy="402" r="5.1"/>
      </g>
      <g id="${id}-virtual-points" fill="#fbf8f1" stroke="#667f91" stroke-width="1.5"><circle id="${id}-point-fp" cx="870" cy="735" r="4.4"/><circle id="${id}-point-tp" cx="870" cy="384" r="4.4"/></g>
      <g class="svg-point">
        <text id="${id}-label-t" x="340" y="376">T</text><text id="${id}-label-e" x="340" y="426">E</text><text id="${id}-label-f" x="340" y="755">F</text>
        <text id="${id}-label-o" x="610" y="754" style="display:none">O</text><text id="${id}-label-p" x="610" y="594">P</text><text id="${id}-label-q" x="610" y="398">Q</text>
        <text id="${id}-label-fp" x="880" y="755">F′</text><text id="${id}-label-tp" x="880" y="378">T′</text>
      </g>
      <g id="${id}-distance-guide" fill="none" stroke="#758998" stroke-width="1">
        <path id="${id}-distance-path" d="M330 768v-8 M330 764H600 M600 768v-8"/>
        <text id="${id}-distance-label" class="svg-small" x="465" y="788" text-anchor="middle" fill="#50677a" stroke="#fbf8f1" stroke-width="3" paint-order="stroke" font-size="13">60 cm</text>
      </g>
    </svg>`;

  root.innerHTML = `
    <header class="mlab-heading">
      <div class="mlab-heading-copy"><h1 id="${id}-title" data-i18n="title">${escapeHtml(text("title"))}</h1><p data-i18n="subtitle">${escapeHtml(text("subtitle"))}</p></div>
      <div class="mlab-actions">
        <button class="mlab-button mlab-button--plain" type="button" data-action="back" data-i18n="back">${escapeHtml(text("back"))}</button>
        <button class="mlab-button mlab-button--plain" type="button" data-action="question" aria-controls="${id}-question" aria-expanded="false" data-i18n-aria="questionToggleAria"><span data-dynamic-label="question">${escapeHtml(text("viewQuestion"))}</span></button>
        <button class="mlab-button mlab-button--plain" type="button" data-action="reset" data-i18n="reset" data-i18n-aria="resetAria">${escapeHtml(text("reset"))}</button>
      </div>
    </header>
    <section class="mlab-question">
      <button class="mlab-question-toggle" type="button" data-action="question" aria-controls="${id}-question" aria-expanded="false" data-i18n-aria="questionToggleAria">
        <span data-dynamic-label="question">${escapeHtml(text("viewQuestion"))}</span><svg class="mlab-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 6 4.5 4.5L12.5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="mlab-question-body" id="${id}-question" hidden><p data-i18n="questionLead">${escapeHtml(text("questionLead"))}</p><ol type="a"><li data-i18n="questionA">${escapeHtml(text("questionA"))}</li><li data-i18n="questionB">${escapeHtml(text("questionB"))}</li></ol></div>
    </section>
    <div class="mlab-layout">
      <section class="mlab-scene-column" aria-labelledby="${id}-scene-heading">
        <div class="mlab-scene-shell">
          <div class="mlab-scene-head"><h2 class="mlab-scene-title mlab-sr-only" id="${id}-scene-heading" data-i18n="sceneTitle">${escapeHtml(text("sceneTitle"))}</h2></div>
          <div class="mlab-status-row"><span class="mlab-status" id="${id}-status" data-state="partial" aria-live="polite"></span><span class="mlab-visible-range" id="${id}-range-status" aria-live="polite"></span></div>
          <div class="mlab-scene-wrap">${svgMarkup}</div>
          <div class="mlab-scene-caption">
            <span class="mlab-legend"><span class="mlab-legend-mark" aria-hidden="true"><i></i><i></i></span><span data-i18n="fullImageLegend">${escapeHtml(text("fullImageLegend"))}</span></span>
            <span class="mlab-ray-legend"><i class="mlab-ray-swatch" aria-hidden="true"></i><span data-i18n="rayLegend">${escapeHtml(text("rayLegend"))}</span></span>
          </div>
          <p class="mlab-current-note" id="${id}-reference-note" aria-live="polite"></p>
        </div>
      </section>
      <aside class="mlab-proof-column" aria-labelledby="${id}-proof-heading">
        <h2 class="mlab-proof-heading" id="${id}-proof-heading" data-i18n="proofsTitle">${escapeHtml(text("proofsTitle"))}</h2>
        <button class="mlab-proof-card" id="${id}-lower-card" type="button" aria-pressed="false" data-card="lower" data-i18n-aria="lowerCardAria">
          <span class="mlab-card-title"><span data-i18n="lowerCardTitle">${escapeHtml(text("lowerCardTitle"))}</span><small data-i18n="lowerCardEquation">${escapeHtml(text("lowerCardEquation"))}</small></span>
          <span class="mlab-proof-content">${miniTriangleMarkup("lower", text("lowerMiniAria"))}<span class="mlab-card-equations">
            <p class="mlab-ratio">b/70 = <span id="${id}-lower-ratio">60/120</span> = 1/2</p>
            <p class="mlab-result" data-i18n="lowerResult">${escapeHtml(text("lowerResult"))}</p>
            <p class="mlab-subresult"><span data-i18n="lowerMeaning1">${escapeHtml(text("lowerMeaning1"))}</span><br><span data-i18n="lowerMeaning2">${escapeHtml(text("lowerMeaning2"))}</span></p>
          </span></span>
        </button>
        <button class="mlab-proof-card" id="${id}-upper-card" type="button" aria-pressed="false" data-card="upper" data-i18n-aria="upperCardAria">
          <span class="mlab-card-title"><span data-i18n="upperCardTitle">${escapeHtml(text("upperCardTitle"))}</span><small data-i18n="upperCardEquation">${escapeHtml(text("upperCardEquation"))}</small></span>
          <span class="mlab-proof-content">${miniTriangleMarkup("upper", text("upperMiniAria"))}<span class="mlab-card-equations">
            <p class="mlab-ratio">L/78 = <span id="${id}-upper-ratio">60/120</span> = 1/2</p>
            <p class="mlab-result" data-i18n="upperResult">${escapeHtml(text("upperResult"))}</p>
            <p class="mlab-subresult"><span data-i18n="upperTop">${escapeHtml(text("upperTop"))}</span><br><span data-i18n="upperMeaning1">${escapeHtml(text("upperMeaning1"))}</span><br><span data-i18n="upperMeaning2">${escapeHtml(text("upperMeaning2"))}</span></p>
          </span></span>
        </button>
        <p class="mlab-card-hint" data-i18n="proofHint">${escapeHtml(text("proofHint"))}</p>
        <section class="mlab-explain">
          <button class="mlab-button mlab-button--primary mlab-explain-toggle" id="${id}-solution-toggle" type="button" data-action="solution" aria-controls="${id}-solution" aria-expanded="false" data-i18n-aria="solutionToggleAria">
            <span data-dynamic-label="solution">${escapeHtml(text("explain"))}</span><svg class="mlab-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 6 4.5 4.5L12.5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="mlab-explain-body" id="${id}-solution" hidden>
            <h3 data-i18n="explainHeading1">${escapeHtml(text("explainHeading1"))}</h3><p data-i18n="explainText1">${escapeHtml(text("explainText1"))}</p>
            <h3 data-i18n="explainHeading2">${escapeHtml(text("explainHeading2"))}</h3><p data-i18n="explainText2">${escapeHtml(text("explainText2"))}</p>
            <p class="mlab-final-answer" data-i18n="conclusion">${escapeHtml(text("conclusion"))}</p>
          </div>
        </section>
      </aside>
    </div>
    <section class="mlab-controls" aria-labelledby="${id}-control-heading">
      <h2 id="${id}-control-heading" class="mlab-sr-only" data-i18n="controlTitle">${escapeHtml(text("controlTitle"))}</h2>
      <div class="mlab-control"><div class="mlab-control-top"><label for="${id}-distance" data-i18n="distance">${escapeHtml(text("distance"))}</label><output id="${id}-distance-value" for="${id}-distance">60 cm</output></div><input class="mlab-range" id="${id}-distance" type="range" min="30" max="80" step="1" value="60" data-control="d" data-i18n-aria="distanceRangeAria"><div class="mlab-control-foot"><span>30 cm</span><span>80 cm</span></div></div>
      <div class="mlab-control"><div class="mlab-control-top"><label for="${id}-bottom" data-i18n="bottom">${escapeHtml(text("bottom"))}</label><output id="${id}-bottom-value" for="${id}-bottom">40 cm</output></div><input class="mlab-range" id="${id}-bottom" type="range" min="0" max="55" step="1" value="40" data-control="b" data-i18n-aria="bottomRangeAria"><div class="mlab-control-foot"><span>0 cm</span><span id="${id}-bottom-max">55 cm</span></div></div>
      <div class="mlab-control"><div class="mlab-control-top"><label for="${id}-length" data-i18n="length">${escapeHtml(text("length"))}</label><output id="${id}-length-value" for="${id}-length">40 cm</output></div><input class="mlab-range" id="${id}-length" type="range" min="5" max="55" step="1" value="40" data-control="L" data-i18n-aria="lengthRangeAria"><div class="mlab-control-foot"><span>5 cm</span><span id="${id}-length-max">55 cm</span></div></div>
      <div class="mlab-control-actions"><button class="mlab-switch" id="${id}-light" type="button" data-action="light" aria-pressed="true" data-i18n-aria="toggleLight"><span data-dynamic-label="light">${escapeHtml(text("toggleLight"))}</span><span class="mlab-switch-track" aria-hidden="true"><i class="mlab-switch-thumb"></i></span></button><span class="mlab-reset-note" data-i18n="topLimit">${escapeHtml(text("topLimit"))}</span></div>
    </section>
    <p class="mlab-footnote" data-i18n="localNote">${escapeHtml(text("localNote"))}</p>
  `;
  const byId = (suffix) => root.querySelector("#" + id + "-" + suffix);
  const statusState = () => {
    const current = installation(state.b, state.b + state.L, MODEL.height, MODEL.eye);
    if (current.visibleRange.empty) return ["statusNoRange", "none"];
    if (current.shortestCorrect) return ["statusShortest", "full"];
    if (current.fullBodyVisible) return ["statusShorter", "full"];
    if (current.headVisible && !current.footVisible) return ["statusHead", "partial"];
    if (current.footVisible && !current.headVisible) return ["statusFeet", "partial"];
    return ["statusNeither", "none"];
  };
  const referencePointsCovered = () => {
    const current = installation(state.b, state.b + state.L, MODEL.height, MODEL.eye);
    return current.footVisible && current.headVisible;
  };
  const rangeDescription = () => {
    const range = visibleBodyRange(state.b, state.b + state.L, MODEL.eye, MODEL.height);
    return range.empty ? text("visiblePrefix") + "：" + text("noVisibleRange")
      : text("visiblePrefix") + "：" + range.min + "–" + range.max + " cm";
  };

  function updateRangeText() {
    [["distance", state.d], ["bottom", state.b], ["length", state.L]].forEach(([name, value]) => {
      byId(name).setAttribute("aria-valuetext", value + " " + text("cm"));
    });
    byId("distance-value").textContent = state.d + " cm";
    byId("bottom-value").textContent = state.b + " cm";
    byId("length-value").textContent = state.L + " cm";
    byId("lower-ratio").textContent = state.d + "/" + (2 * state.d);
    byId("upper-ratio").textContent = state.d + "/" + (2 * state.d);
    byId("bottom-max").textContent = byId("bottom").max + " cm";
    byId("length-max").textContent = byId("length").max + " cm";
  }

  function updateLanguageText() {
    root.lang = state.lang === "en" ? "en" : "zh-CN";
    root.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (COPY[key]) node.textContent = text(key);
    });
    root.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const key = node.dataset.i18nAria;
      if (COPY[key]) node.setAttribute("aria-label", text(key));
    });
    root.querySelector(".mlab-scene-svg").setAttribute("aria-label", text("sceneAria"));
    root.querySelectorAll(".mlab-mini-diagram")[0].setAttribute("aria-label", text("lowerMiniAria"));
    root.querySelectorAll(".mlab-mini-diagram")[1].setAttribute("aria-label", text("upperMiniAria"));
    root.querySelector('[data-dynamic-label="question"]').textContent = text(state.questionOpen ? "hideQuestion" : "viewQuestion");
    root.querySelectorAll('[data-dynamic-label="question"]')[1].textContent = text(state.questionOpen ? "hideQuestion" : "viewQuestion");
    root.querySelector('[data-dynamic-label="solution"]').textContent = text(state.solutionOpen ? "hideExplain" : "explain");
    root.querySelector('[data-dynamic-label="light"]').textContent = text("toggleLight");
    byId("light").setAttribute("aria-label", text(state.lightOn ? "toggleLightOff" : "toggleLight"));
    const [statusKey] = statusState();
    byId("status").textContent = text(statusKey);
    byId("range-status").textContent = rangeDescription();
    byId("reference-note").textContent = state.selected && !referencePointsCovered() ? text("referenceNote") : "";
    updateRangeText();
  }

  function screenPoint(point) {
    return { x: 600 - 4.5 * point.x, y: 735 - 4.5 * point.y };
  }
  function setLine(name, from, to) {
    const start = screenPoint(from);
    const end = screenPoint(to);
    const line = byId(name);
    line.setAttribute("x1", start.x); line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x); line.setAttribute("y2", end.y);
    const along = .62;
    const x = start.x + (end.x - start.x) * along;
    const y = start.y + (end.y - start.y) * along;
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
    byId(name + "-arrow").setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + angle + ")");
  }
  function trianglePoint(x, height) {
    return (600 + 4.5 * x) + "," + (735 - 4.5 * height);
  }

  function renderScene() {
    const delta = 4.5 * (60 - state.d);
    const xPerson = 330 + delta;
    const xVirtual = 1200 - xPerson;
    const top = state.b + state.L;
    const topY = 735 - 4.5 * top;
    const bottomY = 735 - 4.5 * state.b;
    const mirrorHeight = 4.5 * state.L;

    byId("real-girl").setAttribute("transform", "translate(" + delta + " 0)");
    byId("virtual-full-art").setAttribute("transform", "translate(" + delta + " 0)");
    byId("virtual-visible-art").setAttribute("transform", "translate(" + delta + " 0)");
    byId("real-shadow").setAttribute("cx", xPerson);
    byId("virtual-shadow").setAttribute("cx", xVirtual);
    byId("mirror-face").setAttribute("y", topY); byId("mirror-face").setAttribute("height", mirrorHeight);
    byId("mirror-etch").setAttribute("y", topY); byId("mirror-etch").setAttribute("height", mirrorHeight);
    byId("mirror-shine").setAttribute("d", "M598.2 " + (topY + 1.5) + "v" + (mirrorHeight - 3) + " M602.7 " + (topY + 1.5) + "v" + (mirrorHeight - 3));
    byId("mirror-cap").setAttribute("d", "M595 " + topY + "h10 M595 " + bottomY + "h10");
    ["f", "e", "t"].forEach((point) => byId("point-" + point).setAttribute("cx", xPerson));
    ["fp", "tp"].forEach((point) => byId("point-" + point).setAttribute("cx", xVirtual));
    ["t", "e", "f"].forEach((point) => byId("label-" + point).setAttribute("x", xPerson + 10));
    ["fp", "tp"].forEach((point) => byId("label-" + point).setAttribute("x", xVirtual + 10));

    const foot = rayForReflection(state.d, MODEL.foot, 35, MODEL.eye);
    const head = rayForReflection(state.d, MODEL.height, 74, MODEL.eye);
    setLine("foot-in", foot.incident.from, foot.incident.to);
    setLine("foot-out", foot.reflected.from, foot.reflected.to);
    setLine("head-in", head.incident.from, head.incident.to);
    setLine("head-out", head.reflected.from, head.reflected.to);
    const footP = screenPoint(foot.incident.to);
    const footImage = screenPoint(foot.virtualPoint);
    const headQ = screenPoint(head.incident.to);
    const headImage = screenPoint(head.virtualPoint);
    byId("virtual-foot-ray").setAttribute("x1", footP.x); byId("virtual-foot-ray").setAttribute("y1", footP.y);
    byId("virtual-foot-ray").setAttribute("x2", footImage.x); byId("virtual-foot-ray").setAttribute("y2", footImage.y);
    byId("virtual-head-ray").setAttribute("x1", headQ.x); byId("virtual-head-ray").setAttribute("y1", headQ.y);
    byId("virtual-head-ray").setAttribute("x2", headImage.x); byId("virtual-head-ray").setAttribute("y2", headImage.y);
    const footOnMirror = 35 >= state.b - 1e-7 && 35 <= top + 1e-7;
    const headOnMirror = 74 >= state.b - 1e-7 && 74 <= top + 1e-7;
    byId("foot-in").style.display = byId("foot-out").style.display = state.lightOn && footOnMirror ? "" : "none";
    byId("head-in").style.display = byId("head-out").style.display = state.lightOn && headOnMirror ? "" : "none";
    ["foot-in", "foot-out"].forEach((name) => byId(name + "-arrow").style.display = state.lightOn && footOnMirror ? "" : "none");
    ["head-in", "head-out"].forEach((name) => byId(name + "-arrow").style.display = state.lightOn && headOnMirror ? "" : "none");
    byId("virtual-foot-ray").style.display = state.lightOn && footOnMirror ? "" : "none";
    byId("virtual-head-ray").style.display = state.lightOn && headOnMirror ? "" : "none";
    byId("point-p").classList.toggle("is-uncovered", !footOnMirror);
    byId("point-q").classList.toggle("is-uncovered", !headOnMirror);
    byId("label-p").classList.toggle("is-uncovered", !footOnMirror);
    byId("label-q").classList.toggle("is-uncovered", !headOnMirror);

    const visible = visibleBodyRange(state.b, top, MODEL.eye, MODEL.height);
    const visibleRect = byId("visible-rect");
    if (visible.empty) {
      visibleRect.setAttribute("y", "0"); visibleRect.setAttribute("height", "0");
    } else {
      const yTop = 735 - 4.5 * visible.max;
      const yBottom = 735 - 4.5 * visible.min;
      visibleRect.setAttribute("y", yTop); visibleRect.setAttribute("height", Math.max(0, yBottom - yTop));
    }

    const selected = state.selected;
    const overlay = byId("triangle-overlay");
    overlay.style.display = selected ? "" : "none";
    if (selected === "lower") {
      byId("triangle-large").setAttribute("points", [trianglePoint(state.d, 0), trianglePoint(-state.d, 0), trianglePoint(-state.d, MODEL.eye)].join(" "));
      byId("triangle-small").setAttribute("points", [trianglePoint(state.d, 0), trianglePoint(0, 0), trianglePoint(0, 35)].join(" "));
    } else if (selected === "upper") {
      byId("triangle-large").setAttribute("points", [trianglePoint(-state.d, MODEL.eye), trianglePoint(state.d, 0), trianglePoint(state.d, MODEL.height)].join(" "));
      byId("triangle-small").setAttribute("points", [trianglePoint(-state.d, MODEL.eye), trianglePoint(0, 35), trianglePoint(0, 74)].join(" "));
    }
    byId("point-o").style.display = selected === "lower" ? "" : "none";
    byId("label-o").style.display = selected === "lower" ? "" : "none";
    byId("lower-card").setAttribute("aria-pressed", selected === "lower" ? "true" : "false");
    byId("upper-card").setAttribute("aria-pressed", selected === "upper" ? "true" : "false");

    byId("distance-path").setAttribute("d", "M" + xPerson + " 768v-8 M" + xPerson + " 764H600 M600 768v-8");
    const distanceLabel = byId("distance-label");
    distanceLabel.setAttribute("x", (xPerson + 600) / 2);
    distanceLabel.textContent = state.d + " cm";
    const limits = controlLimits(state.b, state.L);
    byId("bottom").max = String(limits.bottomMax);
    byId("length").max = String(limits.lengthMax);
    byId("bottom").value = String(state.b);
    byId("length").value = String(state.L);
    byId("distance").value = String(state.d);
    byId("light").setAttribute("aria-pressed", state.lightOn ? "true" : "false");
    root.classList.toggle("question-open", state.questionOpen);
    byId("question").hidden = !state.questionOpen;
    byId("solution").hidden = !state.solutionOpen;
    root.querySelectorAll('[data-action="question"]').forEach((button) => button.setAttribute("aria-expanded", state.questionOpen ? "true" : "false"));
    byId("solution-toggle").setAttribute("aria-expanded", state.solutionOpen ? "true" : "false");
    root.querySelectorAll('[data-dynamic-label="question"]').forEach((node) => { node.textContent = text(state.questionOpen ? "hideQuestion" : "viewQuestion"); });
    root.querySelector('[data-dynamic-label="solution"]').textContent = text(state.solutionOpen ? "hideExplain" : "explain");
    root.querySelector('[data-dynamic-label="light"]').textContent = text("toggleLight");
    byId("light").setAttribute("aria-label", text(state.lightOn ? "toggleLightOff" : "toggleLight"));
    const [statusKey, statusKind] = statusState();
    byId("status").dataset.state = statusKind;
    byId("status").textContent = text(statusKey);
    byId("range-status").textContent = rangeDescription();
    byId("reference-note").textContent = selected && !referencePointsCovered() ? text("referenceNote") : "";
    updateRangeText();
  }

  function handleClick(event) {
    const action = event.target.closest("[data-action]");
    if (action && root.contains(action)) {
      if (action.dataset.action === "back") {
        if (typeof onBack === "function") onBack();
      } else if (action.dataset.action === "question") {
        const closingFromQuestionPanel = state.questionOpen && Boolean(action.closest(".mlab-question"));
        state.questionOpen = !state.questionOpen;
        renderScene();
        if (closingFromQuestionPanel) root.querySelector('.mlab-heading [data-action="question"]').focus();
      } else if (action.dataset.action === "reset") {
        state.d = MODEL.distance; state.b = MODEL.bottom; state.L = MODEL.length; state.selected = null; renderScene();
      } else if (action.dataset.action === "solution") {
        state.solutionOpen = !state.solutionOpen; renderScene();
      } else if (action.dataset.action === "light") {
        state.lightOn = !state.lightOn; renderScene();
      }
      return;
    }
    const card = event.target.closest("[data-card]");
    if (card && root.contains(card)) {
      state.selected = state.selected === card.dataset.card ? null : card.dataset.card;
      renderScene();
    }
  }

  function handleInput(event) {
    const input = event.target.closest("[data-control]");
    if (!input || !root.contains(input)) return;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    if (input.dataset.control === "d") state.d = value;
    if (input.dataset.control === "b") state.b = value;
    if (input.dataset.control === "L") state.L = value;
    renderScene();
  }

  root.addEventListener("click", handleClick);
  root.addEventListener("input", handleInput);
  container.appendChild(root);
  updateLanguageText();
  renderScene();
  return {
    setLanguage(nextLang) {
      state.lang = nextLang === "en" ? "en" : "zh";
      updateLanguageText();
    },
    destroy() {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      root.remove();
    }
  };
}
