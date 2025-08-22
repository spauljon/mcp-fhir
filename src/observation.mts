type SimpleObs = {
  id?: string;
  loinc?: string;
  code: { system?: string; code?: string; display?: string };
  value: string | number | boolean | null;
  unit: string | null;
  when: string | null;
  status?: string;
  category?: string;
};

export function simplifyObservation(obs: any): SimpleObs[] {
  const when =
    obs?.effectiveDateTime ??
    obs?.effectivePeriod?.end ??
    obs?.effectiveInstant ??
    obs?.issued ??
    null;

  const base = {
    id: obs?.id,
    when,
    status: obs?.status,
    category: obs?.category?.[0]?.coding?.[0]?.code,
  };

  const sources = [obs, ...(obs?.component ?? [])];

  const pickValueUnit = (src: any) => {
    const value =
      src?.valueQuantity?.value ??
      src?.valueCodeableConcept?.coding?.[0]?.code ??
      src?.valueString ??
      src?.valueInteger ??
      src?.valueBoolean ??
      null;

    const unit =
      src?.valueQuantity?.unit ??
      src?.valueQuantity?.code ??
      src?.valueCodeableConcept?.coding?.[0]?.display ??
      null;

    return {value, unit};
  };

  const pickCode = (src: any) => {
    const code = src?.code?.coding?.[0];
    const system: string | undefined = code?.system;
    const loinc =
      typeof system === "string" && system.toLowerCase().includes("loinc")
        ? code?.code
        : undefined;
    return {
      loinc,
      code: {system, code: code?.code, display: code?.display},
    };
  };

  return sources.reduce<SimpleObs[]>((acc, src) => {
    const {value, unit} = pickValueUnit(src);
    const {loinc, code} = pickCode(src);

    if (value && unit && code) {
      acc.push({
        ...base,
        loinc,
        code,
        value,
        unit,
      });
    }

    return acc;
  }, []);
}

