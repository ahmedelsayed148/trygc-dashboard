"use client";

import React, { useContext, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  FolderPlus,
  Target,
} from "lucide-react";
import { AppContext } from "./Root";
import { FeatureGate } from "./FeatureGate";
import {
  MARKETS,
  TASK_PRIORITIES,
  createOpsCampaign,
  normalizeOpsCampaigns,
  type OpsCampaign,
} from "../lib/operations";
import {
  createCampaignIntakeRecord,
  normalizeCampaignIntakeRecords,
  type CampaignIntakeStage,
} from "../lib/workspaceTools";
import { useNavigate } from "../lib/routerCompat";

const defaultForm = {
  name: "",
  client: "",
  owner: "",
  market: "EGY",
  priority: "Medium",
  stage: "Upcoming" as CampaignIntakeStage,
  startDate: "",
  endDate: "",
  budget: "",
  summary: "",
  notes: "",
};

export function CampaignIntake() {
  return (
    <FeatureGate featureId="campaign-intake">
      <CampaignIntakeContent />
    </FeatureGate>
  );
}

function CampaignIntakeContent() {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const opsCampaigns = normalizeOpsCampaigns(ctx?.opsCampaigns || []);
  const setOpsCampaigns = ctx?.setOpsCampaigns || (() => {});
  const campaignIntakes = normalizeCampaignIntakeRecords(ctx?.campaignIntakes || []);
  const setCampaignIntakes = ctx?.setCampaignIntakes || (() => {});

  const [form, setForm] = useState(defaultForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  const stats = useMemo(() => {
    const upcoming = campaignIntakes.filter((item) => item.stage === "Upcoming").length;
    const ongoing = campaignIntakes.filter((item) => item.stage === "Ongoing").length;
    const synced = campaignIntakes.filter((item) => item.linkedCampaignId).length;

    return {
      upcoming,
      ongoing,
      synced,
      totalCampaigns: opsCampaigns.length,
    };
  }, [campaignIntakes, opsCampaigns.length]);

  const handleChange = (field: keyof typeof defaultForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const stage = form.stage;
    const campaign = createOpsCampaign({
      name: form.name.trim(),
      client: form.client.trim(),
      owner: form.owner.trim(),
      market: form.market,
      priority: form.priority as OpsCampaign["priority"],
      startDate: form.startDate,
      endDate: form.endDate,
      budget: Number(form.budget) || 0,
      notes: [form.summary.trim(), form.notes.trim()].filter(Boolean).join("\n\n"),
      status: stage === "Ongoing" ? "Active" : "Planning",
      currentPhase: stage === "Ongoing" ? "Live" : "Planning",
    });

    const intake = createCampaignIntakeRecord({
      linkedCampaignId: campaign.id,
      name: campaign.name,
      client: campaign.client,
      market: campaign.market,
      owner: campaign.owner,
      priority: campaign.priority,
      stage,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      budget: campaign.budget,
      summary: form.summary.trim(),
      notes: form.notes.trim(),
    });

    setOpsCampaigns((current: OpsCampaign[]) => [campaign, ...normalizeOpsCampaigns(current)]);
    setCampaignIntakes((current: typeof campaignIntakes) => [
      intake,
      ...normalizeCampaignIntakeRecords(current),
    ]);

    setForm(defaultForm);
    setFeedback(`${campaign.name} was added to intake and synced to Campaigns.`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-4 sm:px-6 sm:py-6 dark:bg-black">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-0 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800 sm:p-6 xl:border-b-0 xl:border-r">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                Campaign Intake
              </p>
              <h1 className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                Add upcoming or ongoing campaigns before they get lost in chat
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-500">
                Use this page as the clean intake layer. Every submission creates a structured entry here and
                immediately syncs a full campaign into the main campaign workspace.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <StatCard label="Upcoming" value={stats.upcoming} icon={CalendarDays} />
                <StatCard label="Ongoing" value={stats.ongoing} icon={Clock3} />
                <StatCard label="Synced" value={stats.synced} icon={FolderPlus} />
                <StatCard label="Workspace Campaigns" value={stats.totalCampaigns} icon={Target} />
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">
                      Workflow
                    </p>
                    <h2 className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-100">
                      Intake first, manage later
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate("/campaigns")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 sm:w-auto dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                  >
                    Open Campaigns
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <WorkflowStep
                    step="1"
                    title="Capture basic campaign details"
                    description="Name, client, dates, market, owner, and whether it is upcoming or already live."
                  />
                  <WorkflowStep
                    step="2"
                    title="Auto-sync into operations"
                    description="The intake form creates a full operational campaign with team plans and default tasks."
                  />
                  <WorkflowStep
                    step="3"
                    title="Refine in Campaigns"
                    description="Open the full Campaigns page when you need deeper assignment and subtask control."
                  />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Campaign Name">
                    <input
                      required
                      value={form.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      className={inputClassName}
                      placeholder="Ramadan Creator Push"
                    />
                  </Field>
                  <Field label="Client">
                    <input
                      value={form.client}
                      onChange={(event) => handleChange("client", event.target.value)}
                      className={inputClassName}
                      placeholder="TryGC"
                    />
                  </Field>
                  <Field label="Campaign Owner">
                    <input
                      value={form.owner}
                      onChange={(event) => handleChange("owner", event.target.value)}
                      className={inputClassName}
                      placeholder="Ahmed"
                    />
                  </Field>
                  <Field label="Market">
                    <select
                      value={form.market}
                      onChange={(event) => handleChange("market", event.target.value)}
                      className={inputClassName}
                    >
                      {MARKETS.map((market) => (
                        <option key={market} value={market}>
                          {market}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Campaign Stage">
                    <div className="grid grid-cols-2 gap-2">
                      {(["Upcoming", "Ongoing"] as CampaignIntakeStage[]).map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => handleChange("stage", stage)}
                          className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                            form.stage === stage
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Priority">
                    <select
                      value={form.priority}
                      onChange={(event) => handleChange("priority", event.target.value)}
                      className={inputClassName}
                    >
                      {TASK_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Start Date">
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => handleChange("startDate", event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="End Date">
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(event) => handleChange("endDate", event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Budget">
                    <input
                      type="number"
                      min="0"
                      value={form.budget}
                      onChange={(event) => handleChange("budget", event.target.value)}
                      className={inputClassName}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Quick Summary">
                    <input
                      value={form.summary}
                      onChange={(event) => handleChange("summary", event.target.value)}
                      className={inputClassName}
                      placeholder="Short intake summary"
                    />
                  </Field>
                </div>

                <Field label="Notes">
                  <textarea
                    value={form.notes}
                    onChange={(event) => handleChange("notes", event.target.value)}
                    className={`${inputClassName} min-h-28 resize-none`}
                    placeholder="Paste any supporting notes, assumptions, or kickoff context."
                  />
                </Field>

                {feedback && (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    {feedback}
                  </div>
                )}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-zinc-900 px-5 py-4 text-sm font-black text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                >
                  <BriefcaseBusiness className="h-4 w-4" />
                  Add Campaign To Workspace
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
                Recent Intake
              </p>
              <h2 className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                Latest campaign entries
              </h2>
            </div>
            <button
              onClick={() => navigate("/campaigns")}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-200 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Go To Campaigns
            </button>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {campaignIntakes.length > 0 ? (
              campaignIntakes.slice(0, 8).map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StageBadge stage={item.stage} />
                    <PriorityBadge priority={item.priority} />
                    <MutedBadge>{item.market}</MutedBadge>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-zinc-900 dark:text-zinc-100 sm:text-xl">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    {item.summary || item.notes || "No extra summary added yet."}
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-zinc-500 sm:grid-cols-2">
                    <span>Client: {item.client || "Not set"}</span>
                    <span>Owner: {item.owner || "Not set"}</span>
                    <span>Start: {item.startDate || "Not set"}</span>
                    <span>End: {item.endDate || "Not set"}</span>
                  </div>
                  <div className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                    Added {new Date(item.createdAt).toLocaleString()}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900 sm:p-10">
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 sm:text-xl">
                  No campaign intake entries yet
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Add the first upcoming or ongoing campaign using the form above.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
        <Icon className="h-5 w-5 text-zinc-500" />
      </div>
      <div className="mt-4 text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">{value}</div>
    </div>
  );
}

function WorkflowStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Step {step}</div>
      <div className="mt-2 text-sm font-black text-zinc-900 dark:text-zinc-100">{title}</div>
      <div className="mt-2 text-sm text-zinc-500">{description}</div>
    </div>
  );
}

function StageBadge({ stage }: { stage: CampaignIntakeStage }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
        stage === "Ongoing"
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {stage}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className="rounded-full bg-zinc-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
      {priority}
    </span>
  );
}

function MutedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
