import { useCallback, useMemo, useState } from "react";

type CarModelInput = {
  model_id: number | string;
  car_id: number | string;
  model_name: string;
};

type ParsedModel = {
  model_id: string;
  car_id: string;
  base: string;
  variant: string;
};

export function useCarSelection(carModels: CarModelInput[]) {
  const [selectedMake, setSelectedMakeState] = useState<string>("");
  const [selectedBaseModel, setSelectedBaseModelState] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  const setSelectedMake = useCallback((make: string) => {
    setSelectedMakeState(make);
    setSelectedBaseModelState("");
    setSelectedVariant("");
  }, []);

  const setSelectedBaseModel = useCallback((baseModel: string) => {
    setSelectedBaseModelState(baseModel);
    setSelectedVariant("");
  }, []);

  const parsedModels = useMemo<ParsedModel[]>(() => {
    return carModels
      .map((model) => {
        const raw = String(model.model_name ?? "");
        const [base, ...rest] = raw.split("-").map((s) => s.trim());
        const variant = rest.join(" - ").trim();

        return {
          model_id: String(model.model_id),
          car_id: String(model.car_id),
          base: base ?? "",
          variant: variant || "",
        };
      })
      .filter((model) => model.base);
  }, [carModels]);

  const uniqueBaseModels = useMemo(() => {
    const baseModels = parsedModels
      .filter((model) => model.car_id === String(selectedMake))
      .map((model) => model.base);

    return Array.from(new Set(baseModels)).sort((a, b) => a.localeCompare(b));
  }, [parsedModels, selectedMake]);

  const uniqueVariants = useMemo(() => {
    const variants = parsedModels
      .filter(
        (model) =>
          model.car_id === String(selectedMake) &&
          model.base === selectedBaseModel,
      )
      .map((model) => model.variant);

    return Array.from(new Set(variants)).sort((a, b) => a.localeCompare(b));
  }, [parsedModels, selectedMake, selectedBaseModel]);

  const selectedModelId = useMemo(() => {
    if (!selectedMake || !selectedBaseModel) return "";

    const chosen = parsedModels.find(
      (model) =>
        model.car_id === String(selectedMake) &&
        model.base === selectedBaseModel &&
        (model.variant || "") === (selectedVariant || ""),
    );

    return chosen?.model_id ?? "";
  }, [parsedModels, selectedMake, selectedBaseModel, selectedVariant]);

  return {
    selectedMake,
    setSelectedMake,
    selectedBaseModel,
    setSelectedBaseModel,
    selectedVariant,
    setSelectedVariant,
    selectedModelId,
    uniqueBaseModels,
    uniqueVariants,
  };
}
