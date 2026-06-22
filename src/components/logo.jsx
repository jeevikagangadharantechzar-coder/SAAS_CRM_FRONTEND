const Logo = ({ className = "w-8 h-8" }) => {
  return (
    
    <div className={`${className} relative`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
      <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
        <span className="text-blue-600 font-bold text-xs">AI</span>
      </div>
    </div>
  );
};

export default Logo;