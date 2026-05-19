export function SectionTitle({ eyebrow, title, description }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-cyan-300">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
    </div>
  );
}

export function SectionLabel({ title, description }) {
  return (
    <div className="mb-3 flex flex-col justify-between gap-1 md:flex-row md:items-end">
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
