"use client";

import { useEffect } from "react";

export function SpouseQuestionGuard() {
  useEffect(() => {
    const scopeInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="financesScope"]')
    );
    const childrenNoneInput = document.querySelector<HTMLInputElement>(
      'input[name="childrenNone"]'
    );
    const childrenAgeInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[name="childrenUnder10"], input[name="childrenBetween11And17"], input[name="childrenOver18"]'
      )
    );

    const spouseCards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-spouse-question="true"]')
    );

    const updateState = () => {
      const selectedScope =
        scopeInputs.find((input) => input.checked)?.value === "self_and_spouse"
          ? "self_and_spouse"
          : "self";
      const shouldBlock = selectedScope === "self";

      spouseCards.forEach((card) => {
        card.classList.toggle("classic-question-card-blocked", shouldBlock);
        card.setAttribute("aria-disabled", shouldBlock ? "true" : "false");

        const formFields = card.querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >("input, select, textarea");

        formFields.forEach((field) => {
          field.disabled = shouldBlock;
        });
      });
    };

    const updateChildrenState = () => {
      if (!childrenNoneInput || childrenAgeInputs.length === 0) {
        return;
      }

      const shouldBlockAgeRanges = childrenNoneInput.checked;

      childrenAgeInputs.forEach((field) => {
        if (shouldBlockAgeRanges) {
          field.checked = false;
        }

        field.disabled = shouldBlockAgeRanges;
      });
    };

    updateState();
    updateChildrenState();

    scopeInputs.forEach((input) => input.addEventListener("change", updateState));
    childrenNoneInput?.addEventListener("change", updateChildrenState);

    return () => {
      scopeInputs.forEach((input) => input.removeEventListener("change", updateState));
      childrenNoneInput?.removeEventListener("change", updateChildrenState);
    };
  }, []);

  return null;
}
