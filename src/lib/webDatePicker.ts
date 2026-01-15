import { Platform } from "react-native";

type WebDateMode = "date" | "datetime-local";

type WebDatePickerOptions = {
  mode: WebDateMode;
  initial: Date;
  min?: Date;
  max?: Date;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalDateInput = (value: Date) => {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const toLocalDateTimeInput = (value: Date) => {
  return `${toLocalDateInput(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

const toInputValue = (value: Date, mode: WebDateMode) =>
  mode === "date" ? toLocalDateInput(value) : toLocalDateTimeInput(value);

export const openWebDatePicker = ({ mode, initial, min, max }: WebDatePickerOptions): Promise<Date | null> => {
  if (Platform.OS !== "web") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = mode;
    input.value = toInputValue(initial, mode);
    if (min) {
      input.min = toInputValue(min, mode);
    }
    if (max) {
      input.max = toInputValue(max, mode);
    }

    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.width = "0";
    input.style.height = "0";

    const cleanup = () => {
      input.removeEventListener("change", handleChange);
      input.removeEventListener("blur", handleBlur);
      input.remove();
    };

    const handleChange = () => {
      if (!input.value) {
        cleanup();
        resolve(null);
        return;
      }
      const next = new Date(input.value);
      cleanup();
      resolve(Number.isNaN(next.getTime()) ? null : next);
    };

    const handleBlur = () => {
      cleanup();
      resolve(null);
    };

    input.addEventListener("change", handleChange, { once: true });
    input.addEventListener("blur", handleBlur, { once: true });

    document.body.appendChild(input);
    input.click();
  });
};
