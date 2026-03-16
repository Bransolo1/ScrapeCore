import type { ComBMapping } from "@/lib/types";

interface ComBSectionProps {
  mapping: ComBMapping;
}

interface ColumnProps {
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  groups: { label: string; items: string[] }[];
}

function ComBColumn({ title, color, bgColor, borderColor, icon, groups }: ColumnProps) {
  const allItems = groups.flatMap((g) => g.items);
  if (allItems.length === 0) return null;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-3">
        {groups.map((group) =>
          group.items.length > 0 ? (
            <div key={group.label}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                    <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export default function ComBSection({ mapping }: ComBSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">COM-B Mapping</h2>
        <span className="text-xs text-gray-400 font-normal">Capability · Opportunity · Motivation</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ComBColumn
          title="Capability"
          color="bg-violet-600"
          bgColor="bg-violet-50"
          borderColor="border-violet-200"
          icon={<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
          groups={[
            { label: "Physical", items: mapping.capability.physical },
            { label: "Psychological", items: mapping.capability.psychological },
          ]}
        />
        <ComBColumn
          title="Opportunity"
          color="bg-sky-600"
          bgColor="bg-sky-50"
          borderColor="border-sky-200"
          icon={<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
          groups={[
            { label: "Physical", items: mapping.opportunity.physical },
            { label: "Social", items: mapping.opportunity.social },
          ]}
        />
        <ComBColumn
          title="Motivation"
          color="bg-amber-500"
          bgColor="bg-amber-50"
          borderColor="border-amber-200"
          icon={<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          groups={[
            { label: "Reflective", items: mapping.motivation.reflective },
            { label: "Automatic", items: mapping.motivation.automatic },
          ]}
        />
      </div>
    </div>
  );
}
