const audienceScenarios = {
  design: {
    label: "Designers & illustrators",
    title: "A final deliverable, with context.",
    situation:
      "A designer sends a client the UCE link with a finished illustration.",
    examine:
      "Inspect the named work, recorded claim, rights declaration, and relevant file fingerprint.",
    nextStep:
      "A matching file does not settle ownership or the client agreement. Ask the designer about any gaps before using the work.",
  },
  art: {
    label: "Artists & photographers",
    title: "Look beyond a reposted image.",
    situation: "An artist or photographer shares a record alongside an image.",
    examine:
      "Read who makes the claim and which version the record describes. Compare the original file if you have it.",
    nextStep:
      "A resized or recompressed image can have a different fingerprint. Request the recorded version and discuss permission with the creator.",
  },
  music: {
    label: "Musicians & audio creators",
    title: "Make sure you mean the same version.",
    situation:
      "A musician sends a collaborator a UCE link with a particular mix.",
    examine:
      "Compare the supplied file with the recorded fingerprint and review the dates and declarations.",
    nextStep:
      "A match identifies matching file contents. It does not establish songwriting credits or consent. Confirm those arrangements separately.",
  },
  writing: {
    label: "Writers & authors",
    title: "Review the record with the manuscript.",
    situation: "A writer sends an editor a draft and its public record link.",
    examine:
      "Examine the recorded title, claimant, rights, AI declaration, and the fingerprint of the supplied version.",
    nextStep:
      "A later revision may differ. Ask for the corresponding record and confirm publication permission.",
  },
  film: {
    label: "Filmmakers & video creators",
    title: "Know which cut you are reviewing.",
    situation: "A filmmaker shares a cut with a producer or distributor.",
    examine:
      "Review the file reference and any recorded assertions. Compare the supplied file if it is within the local comparison limit.",
    nextStep:
      "Lens does not clear music, performances, or third-party material. Obtain the needed permissions from the relevant parties.",
  },
  social: {
    label: "Influencers & social creators",
    title: "Give widely shared content a reference.",
    situation:
      "An influencer shares the UCE link associated with a reel, tutorial, review, or sponsored post.",
    examine:
      "Others can examine the recorded claim, dates, rights, and AI-use declaration.",
    nextStep:
      "Lens cannot reconstruct an earlier record or resolve reposting disputes. A reposted or compressed copy may have a different fingerprint. Compare the recorded version when you have it, and share the existing reference with its limits.",
  },
  recipient: {
    label: "Clients, brands & publishers",
    title: "Check the claim before the handoff.",
    situation:
      "A brand or publisher receives a creative work and its UCE link.",
    examine:
      "Review who makes the claim, what was declared about rights and AI, and which checks completed.",
    nextStep:
      "A signature does not establish permission or ownership. Ask the sender to resolve gaps and confirm your agreement before use.",
  },
  other: {
    label: "Collaborators & other creators",
    title: "Put the record beside the work.",
    situation:
      "A collaborator or another creator receives a work with a public UCE reference.",
    examine:
      "Inspect the description and available declarations, dates, and checks. Compare a local file when appropriate.",
    nextStep:
      "The record may not describe every contribution or permission. Ask the relevant people about anything the evidence does not establish.",
  },
} as const;

export type AudienceKey = keyof typeof audienceScenarios;

export interface AudienceOptions {
  selected?: AudienceKey;
  onSelect?: (key: AudienceKey) => void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function creationLink(id: string): HTMLAnchorElement {
  const link = element("a", "Create a UCE at CbyUCE", "button button--quiet");
  link.id = id;
  link.href = "https://cbyuce.com/";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-describedby", "create-uce-service-note");
  return link;
}

export function audienceExamples(
  onInspect: () => void,
  options: AudienceOptions = {},
): HTMLElement {
  const section = element(
    "section",
    undefined,
    "education-section audience-section",
  );
  section.id = "audience-examples";
  section.setAttribute("aria-labelledby", "audience-heading");
  const heading = element("h2", "How would you use Lens?");
  heading.id = "audience-heading";
  const prompt = element("p", "Choose a situation.", "education-intro");
  const grid = element("div", undefined, "audience-grid");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Creator and recipient examples");

  const scenario = element("div", undefined, "audience-scenario");
  scenario.id = "audience-scenario";
  scenario.hidden = true;
  scenario.setAttribute("aria-labelledby", "audience-scenario-title");
  const situationColumn = element("div");
  const title = element("h3");
  title.id = "audience-scenario-title";
  const situation = element("p");
  situationColumn.append(title, situation);
  const examinationColumn = element("div");
  const examine = element("p");
  const nextStep = element("p", undefined, "audience-scenario-limit");
  const inspect = element("button", "Inspect a record", "button button--quiet");
  inspect.id = "audience-inspect-record";
  inspect.type = "button";
  inspect.addEventListener("click", onInspect);
  examinationColumn.append(examine, nextStep, inspect);
  scenario.append(situationColumn, examinationColumn);

  const status = element("p", undefined, "sr-only");
  status.id = "audience-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");

  const buttons = new Map<AudienceKey, HTMLButtonElement>();
  function select(key: AudienceKey, announce: boolean): void {
    const selected = audienceScenarios[key];
    buttons.forEach((button, candidate) => {
      button.setAttribute("aria-pressed", String(candidate === key));
    });
    title.textContent = selected.title;
    situation.textContent = selected.situation;
    examine.textContent = selected.examine;
    nextStep.textContent = selected.nextStep;
    scenario.hidden = false;
    if (announce) {
      status.textContent = `${selected.label} example. ${selected.title} ${selected.situation}`;
    }
  }

  (Object.keys(audienceScenarios) as AudienceKey[]).forEach((key) => {
    const button = element(
      "button",
      audienceScenarios[key].label,
      "audience-button",
    );
    button.id = `audience-${key}`;
    button.type = "button";
    button.dataset.audience = key;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-controls", scenario.id);
    button.addEventListener("click", () => {
      select(key, true);
      options.onSelect?.(key);
    });
    buttons.set(key, button);
    grid.append(button);
  });
  if (options.selected) select(options.selected, false);
  section.append(heading, prompt, grid, scenario, status);
  return section;
}

function aiEducation(): HTMLElement {
  const section = element(
    "section",
    undefined,
    "education-section ai-education",
  );
  section.id = "how-lens-helps";
  section.setAttribute("aria-label", "Understanding AI declarations");
  const training = element("div");
  training.append(
    element("p", "Two separate questions", "eyebrow"),
    element("h2", "What does the record say about AI training?"),
    element(
      "p",
      "Look for the creator's recorded policy on AI model training, dataset creation, machine-learning ingestion, or related computational analysis. Read the exact notice when one is present. Missing information does not mean permission.",
    ),
  );
  const assistance = element("div");
  assistance.append(
    element("p", "The creator's own process", "eyebrow"),
    element("h2", "Was AI assistance declared?"),
    element(
      "p",
      "See whether the record declares AI assistance, declares none, or provides no declaration. Lens reports what was recorded and how much the available checks cover.",
    ),
  );
  section.append(training, assistance);
  return section;
}

function preparedness(): HTMLElement {
  const section = element(
    "section",
    undefined,
    "education-section preparedness",
  );
  section.setAttribute("aria-labelledby", "preparedness-heading");
  const heading = element("h2", "Sharing work that could spread?");
  heading.id = "preparedness-heading";
  const actions = element("div", undefined, "education-actions");
  const note = element("span", "Opens a separate service.", "field-note");
  note.id = "create-uce-service-note";
  actions.append(creationLink("create-uce-before-posting"), note);
  section.append(
    heading,
    element(
      "p",
      "If you think it may go viral, create your UCE before posting. Use Lens to help others inspect that record.",
    ),
    element(
      "p",
      "CbyUCE creates the record. Lens makes existing public records easier to examine. Neither a later inspection nor a file match establishes an earlier creation date.",
      "education-note",
    ),
    actions,
  );
  return section;
}

function questionsAndAnswers(): HTMLElement {
  const section = element("section", undefined, "education-section lens-faq");
  section.id = "lens-questions";
  section.setAttribute("aria-labelledby", "lens-questions-heading");
  const heading = element("h2", "A clearer record. A better next question.");
  heading.id = "lens-questions-heading";
  section.append(heading);

  const questions = [
    {
      id: "ownership",
      question: "Does a successful check prove who owns the work?",
      answer:
        "No. Each check addresses a particular part of the evidence. Use the recorded claim and supporting checks to decide what to ask the creator or publisher next.",
    },
    {
      id: "declarations",
      question: "Why do the rights and AI declarations matter?",
      answer:
        "They help recipients identify the recorded position when attribution, permission, or AI use is questioned. A notice does not itself decide a fair-use question, copyright eligibility, or a legal dispute.",
    },
    {
      id: "missing",
      question: "What if a declaration or check is missing?",
      answer:
        "Read the stated reason. Missing policy information is not permission. An unavailable source is not proof that a claim is false. Ask the sender for clarification or retry an unavailable source.",
    },
    {
      id: "privacy",
      question: "Does Lens upload my file?",
      answer:
        "The browser calculates the selected file's fingerprint locally. Its contents are not uploaded or exposed to agent tools. Lens separately retrieves public records and metadata over the network.",
    },
    {
      id: "creation",
      question: "Can I create a UCE here?",
      answer:
        "Lens inspects existing public UCE records. To create a record for your work, visit CbyUCE, a separate service.",
    },
    {
      id: "community",
      question: "What does community confidence mean here?",
      answer:
        "People can make their statements available for scrutiny, compare the record with the work, and ask informed questions. Lens does not provide community votes, endorsements, or peer certification.",
    },
  ];
  questions.forEach(({ id, question, answer }) => {
    const disclosure = element("details");
    disclosure.id = `lens-faq-${id}`;
    const summary = element("summary", question);
    summary.id = `lens-faq-${id}-summary`;
    disclosure.append(summary, element("p", answer));
    if (id === "creation") {
      const link = element("a", "Create a UCE at CbyUCE (separate service)");
      link.id = "lens-faq-create-link";
      link.href = "https://cbyuce.com/";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const paragraph = element("p");
      paragraph.append(link);
      disclosure.append(paragraph);
    }
    section.append(disclosure);
  });
  return section;
}

export function educationContent(): HTMLElement {
  const content = element("div", undefined, "education-content");
  content.append(aiEducation(), preparedness(), questionsAndAnswers());
  return content;
}
