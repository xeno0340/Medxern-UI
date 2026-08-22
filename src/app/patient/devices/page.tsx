"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Droplet,
  Activity,
  HeartPulse,
  Stethoscope,
  Syringe,
  Wind,
  Monitor,
  Pill,
  X,
  Link2,
} from "lucide-react";

type Device = {
  name: string;
  desc: string;
  icon: LucideIcon;
  category: string;
  status: "available" | "coming_soon";
};

export default function DevicesPage() {
  const devices: Device[] = useMemo(
    () => [
      {
        name: "Home Oxygen Concentrator",
        desc: "Track LTOT usage and oxygen flow.",
        icon: Wind,
        category: "Respiratory",
        status: "available",
      },
      {
        name: "Pulse Oximeter",
        desc: "Monitor SpO₂ continuously at home.",
        icon: HeartPulse,
        category: "Respiratory",
        status: "available",
      },
      {
        name: "Continuous Glucose Monitor",
        desc: "Connect CGM readings for trends.",
        icon: Droplet,
        category: "Metabolic",
        status: "coming_soon",
      },
      {
        name: "IV Infusion Pump",
        desc: "Sync infusion therapy sessions.",
        icon: Syringe,
        category: "Therapy",
        status: "coming_soon",
      },
      {
        name: "Feeding Pump",
        desc: "Nutrition delivery monitoring.",
        icon: Pill,
        category: "Nutrition",
        status: "coming_soon",
      },
      {
        name: "ECG Patch Monitor",
        desc: "Heart rhythm tracking support.",
        icon: Activity,
        category: "Cardiac",
        status: "coming_soon",
      },
      {
        name: "Blood Pressure Monitor",
        desc: "Vitals + cardiovascular trends.",
        icon: Monitor,
        category: "Vitals",
        status: "available",
      },
      {
        name: "Respiratory Nebulizer",
        desc: "Medication delivery schedule sync.",
        icon: Stethoscope,
        category: "Respiratory",
        status: "coming_soon",
      },
    ],
    []
  );

  const [selected, setSelected] = useState<Device | null>(null);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Connect Devices</h1>
        <p className="text-gray-500 mt-2">
          Link your home medical devices to MEDXERN for real-time monitoring and smarter AI summaries.
        </p>
      </div>

      {/* Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {devices.map((device, i) => {
          const Icon = device.icon;

          return (
            <motion.button
              key={i}
              variants={item}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(device)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md text-left transition"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Icon + text */}
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-gray-50 border">
                    <Icon className="h-6 w-6 text-gray-700" />
                  </div>

                  <div>
                    <h2 className="font-medium text-gray-900">{device.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{device.desc}</p>
                    <p className="text-xs text-gray-400 mt-2">{device.category}</p>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    device.status === "available"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {device.status === "available" ? "Available" : "Coming soon"}
                </span>
              </div>

              <p className="text-xs text-gray-400 mt-4">Tap to connect →</p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200"
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 6 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gray-50 border flex items-center justify-center">
                    <selected.icon className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Connect Device</p>
                    <h3 className="text-lg font-semibold text-gray-900">{selected.name}</h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-lg hover:bg-gray-50 transition"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <div className="p-5">
                <p className="text-gray-600">{selected.desc}</p>

                <div className="mt-4 rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-700 font-medium">Demo behavior</p>
                  <p className="text-sm text-gray-600 mt-1">
                    For MVP, this simulates a pairing flow. Later we can integrate Bluetooth / device APIs / FHIR
                    device feeds.
                  </p>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      selected.status === "available"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={selected.status !== "available"}
                    onClick={() => {
                      if (selected.status === "available") {
                        alert(`Connected: ${selected.name} (demo)`);
                        setSelected(null);
                      }
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                    {selected.status === "available" ? "Connect now" : "Not available"}
                  </button>

                  <button
                    className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
