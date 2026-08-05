import { downloadDecisionRecord, renderDecisionRecord } from "./decision-tools.js";
import { createResearchDesignRecord, evaluateResearchDesign } from "./research-design-selector.js";
import { createJournalEvaluationRecord, evaluateJournalEvidence } from "./journal-evaluation-workflow.js";
import { createEvidencePathwayRecord, navigateEvidencePathway } from "./evidence-pathway-navigator.js";

const adapters = {
  "research-design-selector": {
    evaluate: evaluateResearchDesign,
    record: createResearchDesignRecord,
    summarize(result) {
      const routes = result.candidates.map((item) => item.label);
      return routes.length ? `Candidate routes: ${routes.join(", ")}.` : "No defensible route is available from the current inputs.";
    },
  },
  "journal-evaluation-workflow": {
    evaluate: evaluateJournalEvidence,
    record: createJournalEvaluationRecord,
    summarize(result) {
      return `Screening state: ${result.state.replaceAll("-", " ")}.`;
    },
  },
  "evidence-pathway-navigator": {
    evaluate: navigateEvidencePathway,
    record: createEvidencePathwayRecord,
    summarize(result) {
      return `Pathway state: ${result.state.replaceAll("-", " ")}; ${result.pathway.length} governed stages recorded.`;
    },
  },
};

function values(form) {
  const output = {};
  for (const element of form.elements) {
    if (!element.name || element.disabled) continue;
    if (element.type === "checkbox") output[element.name] = element.checked;
    else if (element.type === "radio") {
      if (element.checked) output[element.name] = element.value;
    } else output[element.name] = element.value;
  }
  return output;
}

for (const form of document.querySelectorAll("[data-decision-workflow]")) {
  const toolId = form.dataset.decisionWorkflow;
  const adapter = adapters[toolId];
  if (!adapter) continue;
  const output = document.querySelector("[data-decision-output]");
  const summary = document.querySelector("[data-decision-summary]");
  const recordView = document.querySelector("[data-decision-record]");
  const exportButton = document.querySelector("[data-decision-export]");
  let record = null;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    try {
      const input = values(form);
      const result = adapter.evaluate(input);
      record = adapter.record(input);
      summary.textContent = adapter.summarize(result);
      renderDecisionRecord(record, recordView);
      output.hidden = false;
      output.classList.add("is-revealed");
      output.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      summary.textContent = error instanceof Error ? error.message : "The decision record could not be generated.";
      output.hidden = false;
      recordView.replaceChildren();
      record = null;
    }
  });

  exportButton?.addEventListener("click", () => {
    if (record) downloadDecisionRecord(record, toolId);
  });

  form.addEventListener("reset", () => {
    record = null;
    output.hidden = true;
    recordView.replaceChildren();
  });
}
