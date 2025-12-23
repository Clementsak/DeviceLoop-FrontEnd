// src/components/seller/SellerNewListing.tsx
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  type DeviceOption,
  fetchDeviceOptions,
  signUploadUrl,
  createListingRequest,
  type QuestionnairePayload,
} from "../api/seller";
import { useNavigate } from "react-router-dom";

type Step = 1 | 2 | 3;

const PHOTO_SLOTS = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
  "imei",
] as const;

type PhotoSlot = (typeof PHOTO_SLOTS)[number];

interface PhotoState {
  file?: File;
  previewUrl?: string;
  s3Key?: string; // this stores the S3 *key* (e.g. listings/xxx-front.jpg)
}

interface Props {
  onCreated?: () => void;
  onClose?: () => void;
}

export function SellerNewListing({ onCreated, onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState<DeviceOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedStorageRam, setSelectedStorageRam] = useState<string>("");
  const [selectedDevicePk, setSelectedDevicePk] = useState<string>("");

  const [photos, setPhotos] = useState<Record<PhotoSlot, PhotoState>>(
    () =>
      PHOTO_SLOTS.reduce((acc, slot) => {
        acc[slot] = {};
        return acc;
      }, {} as Record<PhotoSlot, PhotoState>)
  );

  const [questionnaire, setQuestionnaire] = useState<QuestionnairePayload>({
    canPowerOn: true,
    freeOfLocks: true,
    // Use human-readable strings that grading.py expects
    screenCondition: "Flawless",
    bodyCondition: "Flawless",
    biometric: "yes",
    coreFunctions: "ok",
    cameras: "ok",
    seriousIssues: [],
  });

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/seller/listings");
    }
  };

  // ---- Load device options from backend ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchDeviceOptions();
        if (!cancelled) setOptions(items);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load device options.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Derived dropdown lists ----
  const categories = useMemo(
    () =>
      Array.from(new Set(options.map(o => o.category).filter(Boolean))).sort(),
    [options]
  );

  const brands = useMemo(() => {
    if (!selectedCategory) return [];
    return Array.from(
      new Set(
        options
          .filter(o => o.category === selectedCategory)
          .map(o => o.brand)
      )
    ).sort();
  }, [options, selectedCategory]);

  const models = useMemo(() => {
    if (!selectedCategory || !selectedBrand) return [];
    return Array.from(
      new Set(
        options
          .filter(
            o =>
              o.category === selectedCategory && o.brand === selectedBrand
          )
          .map(o => o.model)
      )
    ).sort();
  }, [options, selectedCategory, selectedBrand]);

  const variants = useMemo(() => {
    if (!selectedCategory || !selectedBrand || !selectedModel) return [];
    const opts = options.filter(
      o =>
        o.category === selectedCategory &&
        o.brand === selectedBrand &&
        o.model === selectedModel
    );
    const allVariants = Array.from(
      new Set(opts.map(o => o.variant || "").filter(Boolean))
    ).sort();
    return allVariants;
  }, [options, selectedCategory, selectedBrand, selectedModel]);

  const storageRamOptions = useMemo(() => {
    if (!selectedCategory || !selectedBrand || !selectedModel) return [];
    const opts = options.filter(
      o =>
        o.category === selectedCategory &&
        o.brand === selectedBrand &&
        o.model === selectedModel &&
        (!selectedVariant || !o.variant || o.variant === selectedVariant)
    );
    const all = Array.from(
      new Set(
        opts.map(o => {
          const storage = o.storage || "";
          const ram = o.ram || "";
          return ram ? `${storage} / ${ram}` : storage;
        })
      )
    ).filter(Boolean);
    return all.sort();
  }, [options, selectedCategory, selectedBrand, selectedModel, selectedVariant]);

  // When selection changes, compute which device PK is selected
  useEffect(() => {
    if (
      !selectedCategory ||
      !selectedBrand ||
      !selectedModel ||
      !selectedStorageRam
    ) {
      setSelectedDevicePk("");
      return;
    }

    const match = options.find(o => {
      if (
        o.category !== selectedCategory ||
        o.brand !== selectedBrand ||
        o.model !== selectedModel
      )
        return false;

      if (variants.length > 0 && selectedVariant) {
        if ((o.variant || "") !== selectedVariant) return false;
      }

      const storage = (o.storage || "").trim();
      const ram = (o.ram || "").trim();
      const label = ram ? `${storage} / ${ram}` : storage;

      return label === selectedStorageRam;
    });

    setSelectedDevicePk(match?.pk || "");
  }, [
    options,
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedVariant,
    selectedStorageRam,
    variants.length,
  ]);

  // ---- Step validation ----
  function validateStep1(): boolean {
    if (!selectedCategory || !selectedBrand || !selectedModel) {
      setError("Please select category, brand and model.");
      return false;
    }
    if (variants.length > 0 && !selectedVariant) {
      setError("Please select a variant.");
      return false;
    }
    if (!selectedStorageRam || !selectedDevicePk) {
      setError("Please select a valid storage / RAM option.");
      return false;
    }
    setError(null);
    return true;
  }

  function validateStep2(): boolean {
    const missing = PHOTO_SLOTS.filter(slot => !photos[slot].s3Key);
    if (missing.length > 0) {
      setError(
        `Please upload all required photos (${missing.join(", ")}).`
      );
      return false;
    }
    setError(null);
    return true;
  }
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file); // produces data:image/...;base64,...
    });
  }

  // ---- Photo upload handler (includes preview) ----
  const handlePhotoChange = async (slot: PhotoSlot, file?: File) => {
    if (!file) return;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const contentType = file.type || "application/octet-stream";

        // 1) Make preview first (data: URL -> works with your CSP)
        const previewUrl = await fileToDataUrl(file);
        setPhotos((prev) => ({
          ...prev,
          [slot]: { ...prev[slot], file, previewUrl },
        }));

        // 2) Upload to S3 using presigned PUT
        const { url, key } = await signUploadUrl({
          filename: file.name,
          contentType,
          prefix: `listings/${slot}`,
        });

        const putRes = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });

        if (!putRes.ok) {
          throw new Error(`Upload failed: ${putRes.status} ${putRes.statusText}`);
        }

        // 3) Save the S3 key so Step 2 validation + submit can use it
        setPhotos((prev) => ({
          ...prev,
          [slot]: { ...prev[slot], s3Key: key },
        }));
      } catch (e: any) {
        setError(e?.message || "Upload failed");
      } finally {
        setLoading(false);
      }
    })();
  };


  async function handleSubmit() {
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    setError(null);

    try {
      // align with seller_routes.create_listing_request()
      const payload = {
        device: { pk: selectedDevicePk },
        photos: {
          front: photos.front.s3Key!,
          back: photos.back.s3Key!,
          left: photos.left.s3Key!,
          right: photos.right.s3Key!,
          top: photos.top.s3Key!,
          bottom: photos.bottom.s3Key!,
          imei: photos.imei.s3Key!,
        },
        questionnaire,
      };

      const res = await createListingRequest(payload);

      // backend returns 4xx for rejected devices, so no special flag here;
      // if we ever add `rejected` to response, keep this check:
      if ((res as any).rejected) {
        setError((res as any).message ?? "This device cannot be listed.");
        return;
      }

      if (onCreated) onCreated();
      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Failed to create listing request."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---- Render ----
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Listing Request</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-black"
          >
            ✕ Close
          </button>
        </div>

        {/* Step indicators */}
        <div className="mb-4 flex gap-4 text-sm">
          <StepBadge active={step === 1}>Device details</StepBadge>
          <StepBadge active={step === 2}>Photos</StepBadge>
          <StepBadge active={step === 3}>Condition questions</StepBadge>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <StepDeviceDetails
            categories={categories}
            brands={brands}
            models={models}
            variants={variants}
            storageRamOptions={storageRamOptions}
            selectedCategory={selectedCategory}
            selectedBrand={selectedBrand}
            selectedModel={selectedModel}
            selectedVariant={selectedVariant}
            selectedStorageRam={selectedStorageRam}
            setSelectedCategory={setSelectedCategory}
            setSelectedBrand={setSelectedBrand}
            setSelectedModel={setSelectedModel}
            setSelectedVariant={setSelectedVariant}
            setSelectedStorageRam={setSelectedStorageRam}
          />
        )}

        {step === 2 && (
          <StepPhotos
            photos={photos}
            onChange={handlePhotoChange}
            loading={loading}
          />
        )}

        {step === 3 && (
          <StepQuestions
            questionnaire={questionnaire}
            setQuestionnaire={setQuestionnaire}
          />
        )}

        {/* Footer buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(s => (s - 1) as Step)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => {
                  if (step === 1 && !validateStep1()) return;
                  if (step === 2 && !validateStep2()) return;
                  setStep(s => (s + 1) as Step);
                }}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={loading}
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleSubmit}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Submitting…" : "Send for verification"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// === Sub components ==================================================

function StepBadge({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
          }`}
      >
        {active ? "●" : "○"}
      </div>
      <span className={active ? "font-medium" : "text-gray-500"}>
        {children}
      </span>
    </div>
  );
}

function StepDeviceDetails(props: {
  categories: string[];
  brands: string[];
  models: string[];
  variants: string[];
  storageRamOptions: string[];

  selectedCategory: string;
  selectedBrand: string;
  selectedModel: string;
  selectedVariant: string;
  selectedStorageRam: string;

  setSelectedCategory: (v: string) => void;
  setSelectedBrand: (v: string) => void;
  setSelectedModel: (v: string) => void;
  setSelectedVariant: (v: string) => void;
  setSelectedStorageRam: (v: string) => void;
}) {
  const {
    categories,
    brands,
    models,
    variants,
    storageRamOptions,
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedVariant,
    selectedStorageRam,
    setSelectedCategory,
    setSelectedBrand,
    setSelectedModel,
    setSelectedVariant,
    setSelectedStorageRam,
  } = props;

  const hasVariants = variants.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Start by selecting the exact device you want to list. All options come
        from the verified device catalogue.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Category */}
        <label className="space-y-1 text-sm">
          <span className="font-medium">Category *</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setSelectedBrand("");
              setSelectedModel("");
              setSelectedVariant("");
              setSelectedStorageRam("");
            }}
          >
            <option value="">Select category…</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {/* Brand */}
        <label className="space-y-1 text-sm">
          <span className="font-medium">Brand *</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={selectedBrand}
            onChange={e => {
              setSelectedBrand(e.target.value);
              setSelectedModel("");
              setSelectedVariant("");
              setSelectedStorageRam("");
            }}
            disabled={!selectedCategory}
          >
            <option value="">Select brand…</option>
            {brands.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        {/* Model */}
        <label className="space-y-1 text-sm">
          <span className="font-medium">Model / Variant name *</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={selectedModel}
            onChange={e => {
              setSelectedModel(e.target.value);
              setSelectedVariant("");
              setSelectedStorageRam("");
            }}
            disabled={!selectedBrand}
          >
            <option value="">Select model…</option>
            {models.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        {/* Variant (optional) */}
        {hasVariants && (
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              Variant (for example: Dual SIM, GPU, Processor)
            </span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={selectedVariant}
              onChange={e => {
                setSelectedVariant(e.target.value);
                setSelectedStorageRam("");
              }}
              disabled={!selectedModel}
            >
              <option value="">Select variant…</option>
              {variants.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Storage / RAM */}
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">Storage / RAM *</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={selectedStorageRam}
            onChange={e => setSelectedStorageRam(e.target.value)}
            disabled={!selectedModel}
          >
            <option value="">Select storage / RAM…</option>
            {storageRamOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function StepPhotos(props: {
  photos: Record<PhotoSlot, PhotoState>;
  onChange: (slot: PhotoSlot, file: File | undefined) => void | Promise<void>;
  loading: boolean;
}) {
  const { photos, onChange, loading } = props;

  const labels: Record<PhotoSlot, string> = {
    front: "Front",
    back: "Back",
    left: "Left side",
    right: "Right side",
    top: "Top",
    bottom: "Bottom",
    imei: "IMEI / serial number",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Upload clear photos of all sides of the device and the IMEI / serial
        number screen. All photos are required for verification.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PHOTO_SLOTS.map(slot => {
          const state = photos[slot];
          const inputId = `photo-${slot}`;
          return (
            <div
              key={slot}
              className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50/40 p-4"
            >
              <div className="mb-2 text-sm font-medium">{labels[slot]}</div>
              <label
                htmlFor={inputId}
                className="flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm"
              >
                {state.previewUrl ? (
                  <img
                    src={state.previewUrl}
                    alt={labels[slot]}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-500">
                    Click to upload
                  </span>
                )}
              </label>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={loading}
                onChange={(e) => { void onChange(slot, e.target.files?.[0]); }}
              />
              <div className="mt-2 text-xs text-gray-500">
                {state.s3Key ? "Uploaded" : "No file"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepQuestions(props: {
  questionnaire: QuestionnairePayload;
  setQuestionnaire: Dispatch<SetStateAction<QuestionnairePayload>>;
}) {
  const { questionnaire, setQuestionnaire } = props;

  function update<K extends keyof QuestionnairePayload>(
    key: K,
    value: QuestionnairePayload[K]
  ) {
    setQuestionnaire(prev => ({ ...prev, [key]: value }));
  }

  function toggleIssue(id: string) {
    setQuestionnaire(prev => {
      const has = prev.seriousIssues.includes(id);
      const next = has
        ? prev.seriousIssues.filter(x => x !== id)
        : [...prev.seriousIssues, id];
      return { ...prev, seriousIssues: next };
    });
  }

  const issueOptions: { id: string; label: string }[] = [
    { id: "bloated_battery", label: "Bloated battery / screen / body pop-out" },
    { id: "liquid_damage", label: "Liquid damage" },
    { id: "cannot_power_on", label: "Device cannot turn on / data wipe impossible" },
    { id: "nongenuine_parts", label: "Non-genuine or missing internal parts" },
    { id: "jailbroken", label: "Jailbroken or rooted device" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Locks */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          1. Is your device free of any locks? (Passcode, Find My, Google
          account, Remote Management)
        </p>
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => update("freeOfLocks", true)}
            className={`rounded-full px-4 py-2 ${questionnaire.freeOfLocks
              ? "bg-emerald-600 text-white"
              : "border border-gray-300 text-gray-700"
              }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => update("freeOfLocks", false)}
            className={`rounded-full px-4 py-2 ${!questionnaire.freeOfLocks
              ? "bg-emerald-600 text-white"
              : "border border-gray-300 text-gray-700"
              }`}
          >
            No
          </button>
        </div>
      </div>

      {/* 2. Screen condition */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          2. What is your device LCD and screen condition?
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            ["Flawless", "Flawless"],
            ["2–3 minor scratches", "2–3 minor scratches"],
            ["Heavy scratches", "Heavy scratches"],
            ["Cracked", "Cracked"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                update("screenCondition", value as QuestionnairePayload["screenCondition"])
              }
              className={`rounded-full px-4 py-2 ${questionnaire.screenCondition === value
                ? "bg-emerald-600 text-white"
                : "border border-gray-300 text-gray-700"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Body condition */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          3. What is your device body condition (back and sides)?
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            ["Flawless", "Flawless"],
            ["2–3 minor scratches", "2–3 minor scratches"],
            ["Heavy scratches", "Heavy scratches"],
            ["Dented", "Dented"],
            ["Cracked", "Cracked"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                update("bodyCondition", value as QuestionnairePayload["bodyCondition"])
              }
              className={`rounded-full px-4 py-2 ${questionnaire.bodyCondition === value
                ? "bg-emerald-600 text-white"
                : "border border-gray-300 text-gray-700"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Biometric */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          4. Is your device fingerprint / Face ID working?
        </p>
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => update("biometric", "yes")}
            className={`rounded-full px-4 py-2 ${questionnaire.biometric === "yes"
              ? "bg-emerald-600 text-white"
              : "border border-gray-300 text-gray-700"
              }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => update("biometric", "no")}
            className={`rounded-full px-4 py-2 ${questionnaire.biometric === "no"
              ? "bg-emerald-600 text-white"
              : "border border-gray-300 text-gray-700"
              }`}
          >
            No
          </button>
        </div>
      </div>

      {/* 5. Core functions */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          5. Are all device functions working fine? (Speakers, microphone,
          Wi-Fi, buttons, Bluetooth)
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => update("coreFunctions", "ok")}
            className={`rounded-full px-4 py-2 ${questionnaire.coreFunctions === "ok"
              ? "bg-emerald-600 text-white"
              : "border border-gray-300 text-gray-700"
              }`}
          >
            Yes, everything is working
          </button>
          <button
            type="button"
            onClick={() => update("coreFunctions", "some_issues")}
            className={`rounded-full px-4 py-2 ${questionnaire.coreFunctions === "some_issues"
              ? "bg-emerald-600 text-white"
              : "border border-gray-300 text-gray-700"
              }`}
          >
            Some minor issues
          </button>
          <button
            type="button"
            onClick={() => update("coreFunctions", "major_issues")}
            className={`rounded-full px-4 py-2 ${questionnaire.coreFunctions === "major_issues"
              ? "bg-emerald-600 text-white"
              : "border border-gray-300 text-gray-700"
              }`}
          >
            Major issues
          </button>
        </div>
      </div>

      {/* 6. Cameras */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          6. Are both the front and back cameras working as intended?
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            ["ok", "Yes, both are fine"],
            ["front_issue", "Only front camera has issues"],
            ["back_issue", "Only back camera has issues"],
            ["both_issue", "Both have issues"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => update("cameras", id as any)}
              className={`rounded-full px-4 py-2 ${questionnaire.cameras === id
                ? "bg-emerald-600 text-white"
                : "border border-gray-300 text-gray-700"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 7. Serious issues (checkbox) */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          7. Does your device have any of these issues?
        </p>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {issueOptions.map(({ id, label }) => (
            <label key={id} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={questionnaire.seriousIssues.includes(id)}
                onChange={() => toggleIssue(id)}
              />
              <span>{label}</span>
            </label>
          ))}
          <label className="flex items-start gap-2 md:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={questionnaire.seriousIssues.length === 0}
              onChange={() => {
                setQuestionnaire(prev => ({
                  ...prev,
                  seriousIssues: [],
                }));
              }}
            />
            <span>None of the above</span>
          </label>
        </div>
      </div>
    </div>
  );
}
