// Full-screen loading indicator shown while auth state or page data is resolving.
const LoadingScreen = ({ label = 'Loading…' }) => {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
};

export default LoadingScreen;
