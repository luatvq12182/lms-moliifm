import React from "react";

function Toolbar({ title, desc }) {
    return (
        <div className="mb-4 flex flex-col gap-3">
            <div>
                <div className="text-base font-semibold">{title}</div>
                <div className="text-sm text-zinc-500">{desc}</div>
            </div>

            {/* actions: wrap đẹp trên mobile */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                    placeholder="Tìm kiếm..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 sm:w-[280px]"
                />

                <div className="flex gap-2 sm:ml-auto">
                    <button className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 sm:flex-none">
                        Lọc
                    </button>
                    <button className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 sm:flex-none">
                        + Thêm
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatusPill({ text }) {
    return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
            {text}
        </span>
    );
}

export default function AdminListTemplate({ title, desc, rows }) {
    return (
        <div className="max-w-full">
            <Toolbar title={title} desc={desc} />

            {/* ===== MOBILE (card list) ===== */}
            <div className="grid gap-3 md:hidden">
                {rows.map((r) => (
                    <div
                        key={r.name}
                        className="rounded-2xl border border-zinc-200 bg-white p-4 "
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">
                                    {r.name}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">
                                    {r.sub}
                                </div>
                            </div>
                            <button className="shrink-0 rounded-xl border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50">
                                Xem
                            </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-xs text-zinc-500">
                                Nhóm:{" "}
                                <span className="font-medium text-zinc-700">
                                    {r.group}
                                </span>
                            </div>
                            <StatusPill text={r.status} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ===== DESKTOP/TABLET (table) ===== */}
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white  md:block">
                <div className="overflow-x-auto">
                    <div className="min-w-[860px]">
                        <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
                            <div className="col-span-5">Tên</div>
                            <div className="col-span-3">Nhóm</div>
                            <div className="col-span-2">Trạng thái</div>
                            <div className="col-span-2 text-right">
                                Thao tác
                            </div>
                        </div>

                        {rows.map((r) => (
                            <div
                                key={r.name}
                                className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-zinc-50"
                            >
                                <div className="col-span-5 min-w-0">
                                    <div className="truncate font-medium">
                                        {r.name}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {r.sub}
                                    </div>
                                </div>
                                <div className="col-span-3 text-zinc-700">
                                    {r.group}
                                </div>
                                <div className="col-span-2">
                                    <StatusPill text={r.status} />
                                </div>
                                <div className="col-span-2 text-right">
                                    <button className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-white">
                                        Xem
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
                    Tip: nếu màn hình nhỏ, bảng sẽ cuộn ngang.
                </div>
            </div>
        </div>
    );
}
