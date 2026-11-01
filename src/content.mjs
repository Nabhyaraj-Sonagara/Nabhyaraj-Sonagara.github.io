// Every word on the site lives here. Edit this file, then run `node src/build.mjs`.

export const site = {
  name: "Nabhyaraj Sonagara",
  short: "Nabhyaraj",
  url: "https://nabhyaraj-sonagara.github.io",
  email: "snabhyaraj@gmail.com",
  city: "Ahmedabad, India",
  updated: "November 2026",
  description:
    "Nabhyaraj Sonagara — AI, physics and mathematics in Ahmedabad. Small models written from scratch, multi-agent systems, particle physics tools and research on low-bit reasoning.",
  links: {
    github: "https://github.com/Nabhyaraj-Sonagara",
    linkedin: "https://www.linkedin.com/in/nabhyaraj-sonagara-9624b4419/",
    substack: "https://substack.com/@nabhyaraj",
  },
};

export const nav = [
  { label: "Work", href: "/work/" },
  { label: "Interests", href: "/interests/" },
  { label: "Timeline", href: "/timeline/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
];

export const marquee = [
  "30M parameters", "NumPy only", "4-bit inference", "Raspberry Pi", "chain-of-thought length",
  "four agents, one vault", "ATLAS Open Data", "paper trading only", "Python then C++", "experimental physics", "one paper a week",
];

const gh = (repo) => ({ label: "Code on GitHub", href: `https://github.com/Nabhyaraj-Sonagara/${repo}`, external: true });

// Order here is the order on the Work page. `featured` puts a project on the home page.
export const projects = [
  {
    slug: "ostium", title: "Ostium", date: "Oct 2026", tone: "signal", visual: "ostium", featured: true,
    tags: ["Next.js", "MCP", "Postgres"],
    summary: "Ostium makes small businesses usable by AI agents. Agents can book, shop and send enquiries for a customer, and a free scan grades any business site on how ready it is for them.",
    notes: [
      ["Why", "Customers now ask AI agents to book appointments, compare products and get quotes. Most small business sites are built for people: an agent can read them but cannot act on them, and when it cannot act it moves on to a business where it can. The owner never sees any of it."],
      ["What I built", "A free scanner that works out what customers mainly do on a site — book, buy or get in touch — and checks whether an agent can do that for them. Behind it sit an MCP server for every business, a booking core, product search with carts that hand off to the shop's own checkout, and enquiries that reach the owner by email."],
      ["A detail I like", "The database is the source of truth for bookings. A Postgres exclusion constraint stops two bookings landing in the same slot, even when two agents book at the same moment."],
      ["The name", "Ostium is Latin for doorway. The logo is a doorway, and so is the picture above."],
    ],
    sheet: [["Stack", "Next.js, Postgres"], ["Agents talk to", "MCP, llms.txt"], ["Payments", "Never taken by Ostium"], ["Status", "Live", "ok"]],
    links: [{ label: "ostium.company", href: "https://ostium.company", external: true }],
  },
  {
    slug: "atlas-collision-predictor", title: "ATLAS collision predictor", date: "Aug 2026", tone: "surface", visual: "atlas", featured: true,
    tags: ["C++17", "NumPy", "OpenGL"],
    summary: "A 3D viewer for proton–proton collisions in the style of CERN's ATLAS detector, with a C++ engine that scores each event as signal or background. Trained on real ATLAS Open Data.",
    notes: [
      ["Why", "Most collisions at the LHC are boring. Higgs production is roughly one event in ten billion, so the real problem is a needle in a haystack: does this pile of tracks and energy deposits look like the signal, or like the background?"],
      ["What I built", "The whole pipeline. Real ATLAS events flattened to one row each, a small network trained from scratch in NumPy with hand-written backprop, and its weights exported to a header-only C++17 engine with no machine-learning library of any kind. Tests prove both sides agree bit for bit, and the viewer re-runs the model every frame while you fly around the detector."],
      ["How it did", "ROC AUC 0.808 on 83,868 held-out real events, against a 0.5 baseline, at 262 nanoseconds per event. The number is held down on purpose: the schema has no slot for the hadronic tau, the best feature in the dataset, and the write-up says so rather than hiding it."],
    ],
    sheet: [["Stack", "C++17, NumPy, GLFW"], ["Data", "ATLAS Open Data"], ["ROC AUC", "0.808"], ["Inference", "262 ns / event"], ["Status", "Shipped", "ok"]],
    links: [gh("ATLAS-collision-simulator")],
  },
  {
    slug: "tinygpt", title: "TinyGPT", date: "2026", tone: "ink", visual: "tinygpt", featured: true,
    tags: ["Python", "NumPy", "No frameworks"],
    summary: "A language model of about 30 million parameters, written from scratch in Python and NumPy. Attention, optimiser and tokeniser are all hand-written. It is small enough to run on a Raspberry Pi, and microcontrollers are the next target.",
    notes: [
      ["Why", "I could use a transformer long before I could explain one. A framework keeps the interesting parts behind an API, so I set one rule: Python and NumPy only, and every part hand-written until it trains."],
      ["What I built", "A tokeniser, an attention block, a training loop and an optimiser, wired into a model of about 30 million parameters. The goal was never a benchmark score. It was a model I can read from end to end and still run on hardware that fits in a pocket."],
      ["What is next", "Getting it onto a microcontroller. That needs quantization, which is how I came to write a paper about low-bit models in the first place."],
    ],
    sheet: [["Role", "Sole author"], ["Stack", "Python, NumPy"], ["Weights", "~30M"], ["Runs on", "Raspberry Pi"], ["Status", "In progress"]],
    links: [{ label: "The paper it led to", href: "/quantization-aware-reasoning-distillation/" }],
  },
  {
    slug: "multi-agent-study-system", title: "Multi-agent study system", date: "Sept 2026", tone: "deep", visual: "studySystem", featured: true,
    tags: ["Agents", "Voice", "Obsidian"], badge: "Honorable mention",
    summary: "Four agents that share one job: capture notes by voice, quiz me on them, find the topics I have not covered, and turn a lecture into a study guide. Built in one sitting for a Multi-App AI Agent Hackathon, where it got an honorable mention.",
    notes: [
      ["Why", "Studying produced a pile of things that never spoke to each other: voice notes, lecture recordings and a vault of markdown. One agent doing all four jobs did none of them well, so I stopped asking it to."],
      ["What I built", "A capture agent that files voice notes into the vault, a recall agent that quizzes me from them, a coverage agent that finds the gaps, and an agent that turns a lecture into a study guide. They share the vault as common ground instead of passing messages around, so I can replace any one of them without touching the others."],
      ["The guardrail", "Every write from every agent passes through one fail-closed gate: each agent is scoped to its own folder, writes can only create or append, and every decision lands in an audit log. A dictated “delete every file” just becomes a note that says that. There is no delete to reach."],
      ["What is next", "Splitting the coverage agent further, and finding a measure that shows whether the split actually helped."],
    ],
    sheet: [["Role", "Sole author"], ["Agents", "4, one vault"], ["Apps", "Wispr Flow, Obsidian, NotebookLM"], ["Built in", "One sitting"], ["Result", "Prize, Sept 2026", "ok"]],
    links: [gh("multi-agent-study-system")],
  },
  {
    slug: "fine-print-reader", title: "Fine Print Reader", date: "Oct 2026", tone: "ink", visual: "finePrint",
    tags: ["Claude plugin", "Python", "OpenCV"],
    summary: "A Claude plugin that reads legal documents for you. Send photos of a lease, loan or contract and get back a clean PDF, a plain-language summary and a list of risky clauses, each with the exact quote.",
    notes: [
      ["What it gives back", "A clean PDF, with pages cropped, straightened and cleaned of shadows. A plain-language summary: who, what, money, dates, and how to leave. And a list of risky clauses, each with the exact quote, what it means for you, a High, Medium or Low risk level, and a question to ask before signing."],
      ["How it works", "One skill runs the workflow from photo to report. A Python script cleans the photos with OpenCV and builds the PDF, and a checklist of ten risk types, with extra checks for each kind of document, drives the review."],
      ["Worth knowing", "It is a reading aid, not legal advice. Laws differ by country and state, and for anything important you should still talk to a lawyer or a legal aid service."],
    ],
    sheet: [["Type", "Claude plugin"], ["Stack", "Python, OpenCV"], ["Reads", "Leases, loans, contracts, policies"], ["Licence", "MIT"], ["Status", "Shipped", "ok"]],
    links: [gh("fine-print-reader")],
  },
  {
    slug: "black-hole-simulator", title: "Black hole simulator", date: "Jul 2026", tone: "surface", visual: "blackHole",
    tags: ["C++", "OpenGL", "GLSL"],
    summary: "A black hole simulation in C++ and OpenGL: gravitational lensing in 2D, then light traced along curved paths on the CPU and in a GPU compute shader. My working copy of kavan010's open-source project.",
    notes: [
      ["What it is", "Light near a black hole does not travel in straight lines. This simulation traces those bent paths, called geodesics, and draws what an observer would actually see."],
      ["How it works", "Four programs that build on each other: 2D lensing, geodesics on the CPU, a ray tracer, and a GLSL compute shader that moves the geodesic maths onto the GPU. Built with CMake, GLFW, GLEW and GLM."],
      ["Credit", "The code comes from kavan010's open-source black_hole project. I keep this copy to build, run and take apart."],
    ],
    sheet: [["Stack", "C++17, OpenGL, GLSL"], ["Build", "CMake, vcpkg"], ["Based on", "kavan010/black_hole"], ["Status", "Study copy"]],
    links: [gh("black-hole-simulator-cpp")],
  },
  {
    slug: "lanlink", title: "LanLink", date: "Jul 2026", tone: "signal", visual: "lanlink",
    tags: ["Swift", "SwiftUI", "macOS"],
    summary: "An end-to-end encrypted messenger for Macs on the same Wi-Fi. No phone numbers, no accounts, no cloud: devices find each other over Bonjour and talk directly over TCP.",
    notes: [
      ["What it is", "Each device is known by its hardware MAC address. Messages travel directly between Macs on the same network, encrypted with Curve25519 and AES-256-GCM, and never touch a server."],
      ["What it does", "Files up to 100 MB over the same encrypted session, with live progress on both ends. Typing indicators, unread badges, a Whisper Mode that blurs a message until the reader hovers over it, and signal bars that show the measured round-trip time to each peer."],
      ["When discovery fails", "Strict networks block Bonjour, so you can add a device by its MAC address and IP. LanLink dials it directly on TCP port 42424 and runs the same encrypted handshake."],
    ],
    sheet: [["Platform", "macOS 14+"], ["Stack", "Swift, SwiftUI"], ["Crypto", "Curve25519, AES-256-GCM"], ["Accounts", "None"], ["Status", "Shipped", "ok"]],
    links: [gh("LANLink")],
  },
  {
    slug: "agent-referendum", title: "Agent Referendum", date: "Aug 2026", tone: "deep", visual: "referendum",
    tags: ["Obsidian", "Context design"],
    summary: "A notes vault built as a reference layer for AI agents. They read one brief first, so I never explain myself twice. It is part knowledge base and part operating system for the week.",
    notes: [
      ["Why", "Every new conversation started from zero. I was explaining my projects, my tools and my constraints again several times a week, and each explanation drifted. The agents were working from a version of me that was already out of date."],
      ["What I built", "One vault with three layers: agent context, personal notes, and a life and work operating system. Agents enter through a single brief instead of searching folders. Every open question sits in one file, so the gaps are visible instead of silent."],
      ["What is next", "Pulling in one more source, with a rule that keeps it current once it is there."],
    ],
    sheet: [["Role", "Sole author"], ["Stack", "Obsidian, markdown"], ["Entry", "One brief"], ["Layers", "3"], ["Status", "Live", "ok"]],
    links: [],
  },
  {
    slug: "paper-trading-bots", title: "Paper-trading bots", date: "2026", tone: "ink", visual: "paperTrading",
    tags: ["Python", "Backtesting", "Paper only"],
    summary: "Trading bots trained and run on paper against Indian markets. No real money is involved, so the only thing at risk is my backtest. It is an excuse to learn how a strategy fails before a failure costs anything.",
    notes: [
      ["Why", "I wanted to learn how a strategy fails, and the cheapest version of that lesson costs nothing. Paper trading keeps the feedback and removes the stakes, which makes it much easier to be honest about a bad run."],
      ["What I built", "A harness as much as a bot. Every result is tied to the config that produced it, because a run I cannot reproduce is a run I learned nothing from."],
      ["What is next", "The next strategy, and the one number that would convince me it works rather than that it fits the past."],
    ],
    sheet: [["Role", "Sole author"], ["Stack", "Python"], ["Market", "India"], ["Capital", "Paper only"], ["Status", "In progress"]],
    links: [],
  },
  {
    slug: "computer-diagnostic-tool", title: "Computer diagnostic tool", date: "Jul 2026", tone: "surface", visual: "diagnostic",
    tags: ["Rust", "ratatui", "Linux"],
    summary: "One of my first Rust programs: a terminal dashboard that shows hardware, CPU, memory and sensor readings, refreshed twice a second on any GNU/Linux machine.",
    notes: [
      ["What it is", "A system monitor that lives in the terminal. It draws hardware details, CPU load, memory use and sensor readings, and quits cleanly on q or Escape."],
      ["How it works", "sysinfo gathers the numbers, ratatui draws them and crossterm handles the terminal. The loop is three steps: gather, draw, then wait half a second for a key."],
    ],
    sheet: [["Stack", "Rust"], ["Libraries", "ratatui, sysinfo, crossterm"], ["Runs on", "GNU/Linux"], ["Status", "Shipped", "ok"]],
    links: [gh("computer_diagnostic_tool")],
  },
];

// The Interests board. Physics is the CPU; every other interest is a part wired to it.
// `related` lists work by project slug, or as { title, href, kind } for anything else.
const PAPER = { title: "The low-bit reasoning paper", href: "/quantization-aware-reasoning-distillation/", kind: "Paper" };
const ESSAY = { title: "Is the world getting uglier?", href: "https://substack.com/@nabhyaraj", kind: "Essay" };
export const fields = {
  core: {
    id: "physics", name: "Physics", part: "CPU", ref: "U1 · CPU",
    role: "Central processor",
    text: "The centre of it all. I am heading for work as an experimental physicist, and I want to use AI to make physics more efficient and accessible than ever before. Physics gives the questions; every other part on this board is how I get at them.",
    related: ["atlas-collision-predictor", "black-hole-simulator"],
  },
  nodes: [
    { id: "ai", name: "Artificial intelligence", short: "AI", part: "GPU", ref: "GPU0",
      role: "Parallel compute",
      text: "Small models written from scratch, agents that share one vault, and a paper on low-bit reasoning. It does the heavy lifting for everything else on the board.",
      related: ["tinygpt", "multi-agent-study-system", "agent-referendum", "fine-print-reader", "ostium", PAPER] },
    { id: "maths", name: "Mathematics", short: "Mathematics", part: "RAM", ref: "DIMM1",
      role: "Working memory",
      text: "The third field I study, next to AI and physics, and the thing the CPU keeps reaching for. Hand-written backprop, bits per weight, light bending around a black hole: it is all maths underneath.",
      related: ["tinygpt", "atlas-collision-predictor", PAPER] },
    { id: "writing", name: "Writing", short: "Writing", part: "SSD", ref: "M.2 · SSD1",
      role: "Long-term storage",
      text: "Where things get written down so they last. A frank commentary on life, the universe and everything on Substack, and notes on one paper a week, turned into summaries I can cite later.",
      related: [{ title: "Substack", href: "https://substack.com/@nabhyaraj", kind: "Writing" }, ESSAY, { title: "Weekly paper notes", href: "/interests/research/", kind: "Notes" }] },
    { id: "design", name: "Design", short: "Design", part: "LCD", ref: "LCD1",
      role: "The display",
      text: "How everything looks when it reaches a person. I think about design, want to work at a design firm to make an impact, and built this site on a design system of my own called Kinetic.",
      related: [ESSAY, { title: "This site's code", href: "https://github.com/Nabhyaraj-Sonagara/Nabhyaraj-Sonagara.github.io", kind: "Code" }, "lanlink"] },
    { id: "fintech", name: "Fintech", short: "Fintech", part: "PSU", ref: "PSU1",
      role: "Power supply",
      text: "The fourth field I study. Trading bots trained and run on paper against Indian markets, so I learn how a strategy fails before a failure costs anything.",
      related: ["paper-trading-bots"] },
    { id: "games", name: "Deckbuilders", short: "Deckbuilders", part: "SLOT", ref: "J4",
      role: "Card slot",
      text: "I play score-chasing deckbuilders, which is where I learned that constraints are what make a thing interesting.",
      related: [] },
  ],
};

export const research = {
  intro: "Quantization-aware reasoning distillation. I am writing an independent paper on a problem I keep running into: when a reasoning model is pushed to low bit-widths, it misjudges how long to think. Its chain of thought becomes miscalibrated — too short on the problems that need the steps, too long on the ones that do not.",
  rows: [
    { when: "In progress", title: "Quantization-aware reasoning distillation", text: "The working record of the paper: the question, why it is worth asking, and what is still open.", kind: "Paper", href: "/quantization-aware-reasoning-distillation/" },
    { when: "Oct 2026", title: "Is the world getting uglier?", text: "An essay on design and aesthetics, written from Ahmedabad. On Substack.", kind: "Essay", href: "https://substack.com/@nabhyaraj" },
    { when: "Weekly", title: "Paper notes", text: "Reading notes on one paper a week, turned into structured summaries I can cite later.", kind: "Notes", href: "/contact/" },
  ],
  headingFor: "Experimental physicist and AI researcher. Physics gives the questions. The models are how I get at them.",
};

export const timeline = [
  { when: "Oct 2026", title: "Shipped Fine Print Reader", text: "A Claude plugin that turns photos of a contract into a clean PDF and a list of risky clauses.", kind: "Build", href: "/work/fine-print-reader/" },
  { when: "Oct 2026", title: "Started Ostium", text: "Opening small businesses to AI agents, with a free scan that shows how far a site is from that today.", kind: "Build", href: "/work/ostium/" },
  { when: "Oct 2026", title: "Writing on Substack", text: "A frank commentary on life, the universe and everything.", kind: "Writing", href: "https://substack.com/@nabhyaraj" },
  { when: "Sept 2026", title: "Won a prize at the Multi-App AI Agent Hackathon", text: "A four-agent study system, built in one sitting.", kind: "Build", href: "/work/multi-agent-study-system/" },
  { when: "Sept 2026", title: "Started an independent research paper", text: "On why low-bit reasoning models misjudge how long to think.", kind: "Research", href: "/quantization-aware-reasoning-distillation/" },
  { when: "Aug 2026", title: "Built the ATLAS collision predictor", text: "A from-scratch network trained on real ATLAS Open Data, running live inside a 3D detector view.", kind: "Physics", href: "/work/atlas-collision-predictor/" },
  { when: "Aug 2026", title: "Built a reference vault for my agents", text: "One brief they read before they answer, so context is not something to think about.", kind: "Build", href: "/work/agent-referendum/" },
  { when: "Jul 2026", title: "Took apart a black hole simulation", text: "Light bending around a black hole, traced in C++ and on the GPU.", kind: "Physics", href: "/work/black-hole-simulator/" },
  { when: "Jul 2026", title: "Built LanLink", text: "An encrypted messenger for Macs on the same Wi-Fi, with no accounts and no cloud.", kind: "Build", href: "/work/lanlink/" },
  { when: "Jul 2026", title: "Wrote my first Rust program", text: "A terminal dashboard for hardware, CPU, memory and sensors.", kind: "Build", href: "/work/computer-diagnostic-tool/" },
];

export const about = {
  paras: [
    "I learn by rebuilding. If something looks like magic, I write the smallest honest version of it in plain Python and watch where it breaks. That habit began as curiosity about transformers. It has turned into a model with no framework under it, a study system that runs on agents, and a paper nobody assigned me.",
    "Physics is the other half. I want to work in AI applications in experimental physics; to make physics more efficient and accessible than ever before.",
    "Away from the screen I think about design and want to work at a design firm to make an impact. I also play score-chasing deckbuilders, which is where I learned that constraints are what make a thing interesting.",
  ],
  tools: "Python · NumPy · C++ (learning) · Rust · Swift · Git · Obsidian · AI agents",
  askMe: "Tokenizers, low-bit inference, and why reading a book about a 3000 year-old worm-man will change you.",
};

export const paper = {
  lede: "Squeeze a reasoning model to low bit-widths and it does not simply get worse. It misjudges how long to think. This page is the working record of an independent paper I started in September 2026.",
  question: [
    "A reasoning model decides, without being told, how many steps to spend on a problem. Quantization changes the weights that decision comes out of. My question is deliberately narrow: does low-bit quantization move chain-of-thought length away from the length a problem actually needs, and does it move in a consistent direction?",
    "The failure has two sides. On hard problems the chain is cut short, and the model commits early to an answer it has not earned. On easy problems it runs long, spending steps on something it had already solved. The first costs accuracy. The second costs accuracy and money.",
    "Both look the same from the outside — a number on a benchmark — which is part of why the effect is easy to miss.",
  ],
  oneLine: "Does low-bit quantization miscalibrate how long a model reasons, and can distillation put the calibration back?",
  status: "Drafting. Introduction first. No results to report yet.",
  why: [
    "Low-bit inference is how a model reaches hardware that is not a datacentre: a phone, a single-board computer, a microcontroller. I came to the question from the other direction, while trying to get <a class=\"kn-link\" href=\"/work/tinygpt/\">a 30-million-parameter model I wrote from scratch</a> onto hardware that fits in a pocket. Quantization is the step that makes that possible, and it is the step where the model's behaviour started to shift in ways the accuracy number did not explain.",
    "Most quantization work measures the quality of the final answer. Much less of it measures the shape of the reasoning that produced the answer. If the reasoning budget is miscalibrated, a benchmark score can hold steady while what the model is doing underneath changes a great deal — and the gap shows up later, on the problems nobody tested.",
  ],
  sizeNote: "30M weights at FP16 is 60 MB. At Q4_K_M it is 16.9 MB, not 15 MB — the extra comes from the per-block scales every real format carries. The instrument uses published bits-per-weight, not the nominal bit count.",
  // The method section is still being written. Fill these in and they appear on the page.
  measuring: [],
  measuringNote: "The models, the bit-widths, how the length a problem needs is defined, the metric and the distillation setup are still being written. There are no results on this page because there are none yet. When there are, they go here with the method that produced them, including the runs that did not work.",
  stands: [
    { when: "Sept 2026", title: "Started drafting", text: "Introduction first, so that the question had to be stated plainly before anything else was written.", kind: "Writing" },
    { when: "Weekly", title: "One paper a week, with notes", text: "Structured reading notes, turned into summaries I can cite later by a small tool I built for it.", kind: "Reading" },
  ],
  // Papers get added here as each weekly note is written.
  reading: [],
};
