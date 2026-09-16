export default function PageLoading({message = 'Loading...'}) {
    return (
        <main className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center gap-3 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]" role="status" aria-live="polite">
            <div className="size-7 rounded-full border-3 border-blue-700/20 border-t-blue-700 animate-spin" aria-hidden="true"></div>
            <p className="text-[0.75rem] text-[#363636]/70">{message}</p>
        </main>
    )
}
