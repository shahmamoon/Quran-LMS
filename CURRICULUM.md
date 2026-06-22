# AI/ML Curriculum for Kids & Teens (Ages 9–16)

> Research-backed topic ladder across three levels — **Beginner · Intermediate · Advanced**.
> Synthesized from competitor curricula, formal K-12 AI/CS standards (AI4K12, CSTA, Code.org, UNESCO), tool documentation, and pedagogy/child-safety research. Sources listed at the bottom.

---

## Curriculum philosophy

The curriculum is a **single spiral** that revisits the same five pillars three times —
**Perception/Computer Vision · Representation & Reasoning · Machine Learning · NLP/Generative AI · Societal Impact** —
escalating only the **tool** and the **math** on each pass while keeping core concepts continuous.

**Gate difficulty by tool, not topic.** Image classification, for example, recurs at every level:

| Level | Same concept, harder tool |
|---|---|
| Beginner | No-code Teachable Machine demo |
| Intermediate | Shippable MIT App Inventor phone app |
| Advanced | Coded convolutional neural network in Python |

**Guiding principles**
- **Concept-first, glass-box** — unplugged/play activities build intuition *before* any tool. Tools alone are black boxes that don't build understanding.
- **No-code → low-code/block → text Python** — matches developmental readiness (block-logic fluency ~9–12 before text coding).
- **Every level ships projects** AND carries a **continuous AI-literacy/ethics/safety thread** woven into technical lessons, not bolted on.
- **Math stays light** — no calculus, no backpropagation derivations, no transformer internals. Parameter-fitting (`y = mx + b`) is deferred to Advanced where algebra fluency is typical.
- **Safety is a hard constraint, not a topic** — adult mediation + structured/age-gated tools throughout. No unsupervised open consumer chatbots at any age; LLM-API builds stay in Advanced with parent-consented, teen-appropriate access.

Each level ≈ a **24-lesson block** of 4–6 units → three levels form a coherent **~72-lesson journey** (aligns with the site's existing 96-lesson structure with room for a capstone block). Every unit ends in a **buildable, demonstrable project**.

---

## 🟢 Beginner — Ages 9–11

**Goal:** Understand what AI is and isn't, and train your own no-code models to see how AI perceives, learns, and affects the world.

**Tools:** Unplugged activities · Quick, Draw! · Experiments with Google · Teachable Machine · Machine Learning for Kids · Scratch · Tynker · PictoBlox · Thunkable · Trinket (browser Python)

### Unit 1 — What Is AI and How Does It Perceive?
- What is AI vs. not-AI: an automatic door *senses* but does not *perceive*
- Computers perceive the world using sensors (linking human senses to hardware)
- AI is not sentient: smart speakers don't have thoughts or feelings
- Play with a neural net: Quick, Draw! guesses your doodles
- Explore the Experiments with Google AI gallery (vision, sound, language)
- **Project:** Class "Is it AI?" gallery — sort everyday devices into AI vs. not-AI with a one-line reason for each

### Unit 2 — Representation, Reasoning, and Decision Trees
- Maps as representations: the map is not the territory; route-planning as reasoning
- Decision trees via "guess the animal"; grow the tree by adding a distinguishing question
- Be the machine learner: infer the labeling rule from examples
- Patterns and classification: sorting, Venn diagrams, rule-based decisions
- **Project:** Build an unplugged "guess the animal" decision-tree game on paper and test it on a friend

### Unit 3 — Train Your First Models (No Code)
- Train an image/gesture classifier with Teachable Machine; test accuracy on new examples
- Data-quality intuition: why more and more varied examples make a better model
- Train a text or number model and use it in Scratch via custom ML blocks
- Face / hand / body (pose) tracking with a webcam (block-based)
- Object detection and counting projects (recognize and count household items)
- **Project:** Teachable Machine rock-paper-scissors or gesture recognizer wired into a Scratch reaction game

### Unit 4 — Block-Coded AI Behaviors
- Emotion / facial-expression detection in block code
- Self-driving car simulation (block-based) to make ML behavior tangible
- Build a simple rule/intent-based chatbot (input → response logic)
- Sentiment and sound analysis with block-based ML
- Build AI-powered apps with Thunkable (block app builder)
- **Project:** Block-coded emotion-detector or self-trained classifier app that reacts to the webcam

### Unit 5 — First Steps in Python (Pre-Code Bridge)
- Text-based Python via Trinket: variables, loops, Turtle graphics
- How a Scratch loop maps to a Python `for`-loop (block-to-text bridge)
- Spotting AI around us; comparing AI answers to trusted sources
- **Project:** Trinket Turtle "AI art" program using loops and variables — first real lines of typed code

**AI literacy & ethics thread (Beginner):**
AI is not sentient (software + data patterns, not a person) · AI affects society both ways (diagnosis/accessibility vs. job loss/surveillance) · garbage-in/garbage-out · compare AI answers to trusted sources; AI use is teacher-modeled, not independent · human agency & human-centred mindset.

---

## 🔵 Intermediate — Ages 11–13

**Goal:** Ship real AI artifacts (mobile and web apps), transition to text Python, and reason about the data pipeline, bias, and responsible AI use.

**Tools:** MIT App Inventor · Machine Learning for Kids · PictoBlox · ml5.js · p5.js · Python · Thonny · Jupyter/Colab · Experience AI · Code.org AI/ML · Day of AI · Google AI Studio · OpenAI (supervised)

### Unit 1 — From Signal to Meaning
- The abstraction pipeline: signal → meaning in stages (pixels → edges → objects; sound → phonemes → words)
- How a machine *learns* vs. how a machine *creates* (generative-AI intro)
- The conceptual ML pipeline: data → train → test → evaluate accuracy (no calculus)
- Decision-tree learning made explicit: learning = changes to an internal representation (glass-box)
- **Project:** Hand-build then inspect a small decision tree on a real dataset; diagram a perception pipeline for an app idea

### Unit 2 — Bias and the Data Behind Models
- Bias from unrepresentative training data: train a tomato/apple classifier to *feel* a flawed dataset
- Train a model from raw tabular data and interpret a model card
- Why unbalanced or incomplete data produces unfair AI
- Critiquing AI output: error-hunt exercises on supervised chatbots
- **Project:** Biased vs. balanced classifier experiment — train both, compare, write a short model card

### Unit 3 — Ship a Mobile AI App
- Build a mobile app that classifies images (camera → label + confidence) with App Inventor Look extension
- Turn a trained ML model into a deployable mobile app
- Train a personal image classifier and embed it in an app
- Face-mesh camera filter app: real-time facial-landmark AI
- **Project:** A published-to-phone image-classifier app that names objects with confidence scores (or a Facemesh filter app)

### Unit 4 — Coded ML on the Web
- Creative-coded web ML: image classification with ml5.js + p5.js
- Pose detection with ml5.js BodyPose (MoveNet/BlazePose)
- Build a KNN classifier in code; import a Teachable Machine model
- Block-code AI with self-trained face/object/pose detectors
- **Project:** ml5.js + p5.js interactive — a pose- or image-driven web sketch using your own imported model

### Unit 5 — Transition to Python
- Transition to text-based Python for real AI programs (Thonny / Colab)
- Python fundamentals: variables, loops, functions
- Reimplement an earlier gesture or sound classifier in Python (deliberate spiral)
- Prompt-engineering basics for LLMs (supervised, age-appropriate)
- Project-based builds with student voice and choice (sharable artifacts)
- **Project:** A Python mini-project that re-creates a previously block-built classifier, run in Colab and shared

**AI literacy & ethics thread (Intermediate):**
Bias from unrepresentative data · a model is a program that makes a decision; reading model cards · critiquing AI output (mistakes, hallucinations) · responsible/safe generative-AI use (disclosure, prompt critique; AI is not a substitute for friends/support) · human accountability.

---

## 🟣 Advanced — Ages 13–16

**Goal:** Build, train, and deploy real AI in Python — neural nets, computer vision, and NLP — and apply systemic ethics to a social-good capstone.

**Tools:** Python · JavaScript · Pandas · NumPy · Matplotlib · scikit-learn · TensorFlow/Keras · PyTorch · OpenCV · Hugging Face · NLTK · TensorFlow Playground · OpenAI API · Gemini API · Replit · Kaggle · Colab · GitHub · Elements of AI · n8n (supervised)

### Unit 1 — Data Science Foundations
- Data exploration, manipulation, visualization with Pandas, NumPy, Matplotlib
- Statistics for ML: distributions and entropy
- Loss functions and train/test splitting
- The data-science process + data ethics & privacy (collection, anonymization, big-data privacy)
- **Project:** End-to-end exploratory data analysis on a real Kaggle dataset with cleaned data and visualizations

### Unit 2 — Classical Machine Learning
- Fit a model by adjusting parameters: slope/intercept for `y = mx + b`, then nonlinear
- Decision trees and logistic regression in scikit-learn
- Classical AI: search, games, probability, naive Bayes (Elements of AI, top of band)
- Symbolic vs. feature-vector representations; knowledge graphs; a taste of logical inference
- Real-world dataset ML project (e.g. plant-disease or attendance prediction)
- **Project:** Train and evaluate a scikit-learn classifier on a messy real dataset; report accuracy with a train/test split

### Unit 3 — Neural Networks and Computer Vision
- Neural networks: weights, layers, training small feed-forward nets (TensorFlow Playground)
- Conceptual neural nets and how LLMs work (analogy level: layers, weights, next-token prediction)
- Build and train a neural network in Python (intuition + implementation)
- Convolutional neural networks and image classification (MNIST, Quick Draw)
- Computer vision with OpenCV; deepfake-detection-style CV models
- **Project:** Train a CNN image/handwriting classifier (MNIST), then a small OpenCV vision app

### Unit 4 — NLP and Generative AI
- NLP / text classification in Python (sentiment) with Hugging Face / NLTK
- NLP nuance: parsing, syntax trees, ambiguity, statistical vs. true understanding
- Generative AI: identify hallucinations and bias; debug and improve generative outputs
- Build AI apps with LLM APIs: OpenAI, Gemini, Hugging Face (supervised, age-gated)
- Build a Python AI chatbot via an LLM API in a full IDE (Replit, supervised)
- **Project:** Supervised LLM-API chatbot or text-classifier app with prompt evaluation and hallucination checks

### Unit 5 — Deploy, Automate, and Ethics in Practice
- Deploy a real-time or custom AI model (web app)
- No-code AI agents and chatbot automations (n8n, supervised)
- Building and refining ML models independently in Python (multi-step CV/NLP workflows)
- Systemic ethics in practice: bias mitigation, transparency/disparate-impact testing, economic impact
- **Project:** Deploy a working custom AI app with a written ethics/transparency review of its data and risks

### Unit 6 — Social-Good Capstone
- Scope an AI-for-Social-Good problem and dataset
- Build, iterate, and deploy a custom live app (ethics by design)
- Present and defend the project, including limitations and bias
- AI ethics and social-implications wrap-up
- **Project:** Deployed live AI-for-Social-Good app presented with a slide deck and GitHub repo

**AI literacy & ethics thread (Advanced):**
Systemic ethics (algorithmic bias via correlated variables, transparency/auditing, economic impact) · algorithmic fairness, facial-recognition ethics, privacy & GDPR · generative-AI hallucinations/bias/debugging · narrow AI vs. AGI; Turing Test & Chinese Room · ethics by design & AI-era citizenship · **safety:** LLM-API/agent builds require adult supervision and teen-appropriate, parent-consented access.

---

## Progression between levels

Advancement is gated by **readiness signals, not age alone**:

- **Beginner → Intermediate:** block-coding fluency (loops, variables, conditions in own projects) + can articulate the *data → train → test → iterate* loop on a model they built.
- **Intermediate → Advanced:** working Python syntax (variables, loops, functions in Thonny/Colab) + has shipped a real artifact (mobile/web app embedding a model) + vocabulary of the ML pipeline, dataset bias, and model cards.
- **Within Advanced:** assumes algebra fluency (for parameter-fitting / `y=mx+b` intuition). Classical-AI/probability (Elements of AI) and the most independent LLM-API/agent builds are pitched at the **top of the band (15–16)** and motivated learners.

Each level reuses the prior level's project types in a more technical tool — a student who skips a level lacks the spiral scaffolding. The **ethics/safety thread is cumulative and non-skippable**: bias intuition at Beginner → dataset-bias lessons at Intermediate → algorithmic-fairness & GDPR work at Advanced.

---

## ⛔ Deliberately deferred (too advanced for under-16)

- **Backpropagation & gradient-descent math** — needs calculus/linear algebra; introduce only post-16
- **Transformer internals** (self-attention, Q/K/V matrices, multi-head, positional encodings) — teach LLMs at analogy level only; reserve internals for post-secondary
- **Unsupervised use of open consumer chatbots** across the entire 9–16 band — documented real harms; keep adult mediation + structured/age-gated tools at all ages
- **Deriving NN layer types as memorized facts** — teach the Learning idea conceptually, not as rote architecture
- **Independent/unsupervised LLM-API or AI-agent building** — OpenAI age-gates under-18; requires parent-consented, teacher-supervised access even at Advanced
- **Research-grade tooling as student-driven activities** — keep as optional teacher-led demos only

---

## Sources

**Standards & frameworks**
- AI4K12 — [5 Big Ideas in AI](https://ai4k12.org/big-ideas/) · [Grade-band progression charts](https://ai4k12.org/gradeband-progression-charts/) · [AI Thinking in K-12](https://ai4k12.org/artificial-intelligence-thinking-in-k-12/) · [Touretzky & Gardner-McCune paper](https://ai4k12.org/wp-content/uploads/2021/01/Touretzky_Gardner-McCune_AI-Thinking_2021.pdf)
- UNESCO — [AI Competency Framework for Students](https://www.unesco.org/en/articles/ai-competency-framework-students) · [full PDF](https://unesdoc.unesco.org/ark:/48223/pf0000391105)
- Code.org — [AI Foundations](https://code.org/en-US/curriculum/artificial-intelligence-foundations) · [CSAIF course](https://courseinfo.code.org/csaif/)
- [Raspberry Pi Experience AI](https://www.raspberrypi.org/blog/experience-ai-launch-lessons/) · [Google DeepMind K-12](https://deepmind.google/discover/blog/empowering-the-next-generation-for-an-ai-enabled-world/) · [Elements of AI](https://course.elementsofai.com/) · [Day of AI](https://www.dayofai.org/)

**Competitor curricula**
- [TalentGum AI/ML](https://talentgum.com/courses/coding/coding-ai-ml-online-classes) · [Create & Learn](https://www.create-learn.us/ai-for-kids/ai-explorers) · [iD Tech](https://www.idtech.com/courses/artificial-intelligence-and-machine-learning) · [Inspirit AI](https://www.inspiritai.com/liveonline) · [Codingal](https://www.codingal.com/courses/ai-and-machine-learning/) · [Tynker](https://www.tynker.com/parents/curriculum/introduction-to-ai-ml/lessons/) · [AI Camp](https://www.ai-camp.org/ai-bootcamp)

**Tools**
- [Teachable Machine](https://teachablemachine.withgoogle.com/) ([blog](https://blog.google/innovation-and-ai/products/teachable-machine/)) · [Machine Learning for Kids](https://machinelearningforkids.co.uk/) ([2026 review](https://www.kidsaitools.com/en/articles/machine-learning-for-kids-review-2026)) · [TensorFlow Playground](https://playground.tensorflow.org/) ([AI4K12 guide](https://ai4k12.org/tensorflow-playground/))
- [Quick, Draw!](https://quickdraw.withgoogle.com/) · [Experiments with Google (AI)](https://experiments.withgoogle.com/collection/ai) · [Scratch ML pathway](https://projects.raspberrypi.org/en/pathways/scratch-machine-learning) · [PictoBlox](https://thestempedia.com/product/pictoblox/) ([expression recognizer](https://ai.thestempedia.com/docs/pictoblox/pictoblox-tutorials/making-an-expression-recognizer-using-face-detection-in-pictoblox/))
- MIT App Inventor — [AI with App Inventor](https://appinventor.mit.edu/explore/ai-with-mit-app-inventor) · [Look extension](https://appinventor.mit.edu/explore/resources/ai/image-classification-look-extension) · [PICaboo](https://appinventor.mit.edu/explore/resources/ai/picaboo)
- [ml5.js](https://ml5js.org/) ([Coding Train guide](https://thecodingtrain.com/tracks/ml5js-beginners-guide/)) · [Trinket](https://trinket.io/) · [Replit](https://replit.com/) · [n8n](https://n8n.io/) · [Prompt-engineering intro (CyberLite)](https://www.cyberlite.org/resource/introduction-to-prompt-engineering)

**Pedagogy & child safety**
- [OpenAI age prediction](https://openai.com/index/building-towards-age-prediction/) · [arXiv child-AI safety](https://arxiv.org/html/2505.21398v1) · [K-12 AI standards guide](https://edfortech.com/stem-education/teaching-ai-in-k-12-a-guide-to-ai-standards-for-teachers/)
- [Block vs. text coding for kids (JetLearn)](https://www.jetlearn.com/blog/block-coding-vs-text-based-coding-whats-better-for-kids) · [Wolfram: ML for middle-schoolers](https://writings.stephenwolfram.com/2017/05/machine-learning-for-middle-schoolers/) · [PMC pedagogy study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9342939/)
- EdWeek — [age-appropriate AI use](https://www.edweek.org/technology/what-is-age-appropriate-use-of-ai-4-developmental-stages-to-know-about/2024/02) · [are chatbots safe for kids](https://www.edweek.org/technology/are-chatbots-safe-for-kids/2025/09) · [Penn State: chatbots & child safety](https://extension.psu.edu/ai-chatbots-and-childrens-digital-safety) · [ScienceDirect study](https://www.sciencedirect.com/science/article/pii/S0747563219300184) · [Lumiere: AI research topics for HS](https://www.lumiere-education.com/post/ai-research-topics-for-high-school-students)

---

*Generated from a 4-angle multi-agent web research sweep (competitors · standards · tools · pedagogy/safety), with each angle adversarially fact-checked before synthesis.*
