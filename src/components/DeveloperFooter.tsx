import vanniLogo from "@/assets/vanni-logo.png";

const DeveloperFooter = () => {
  return (
    <footer
      className="w-full flex items-center justify-center gap-2 border-t"
      style={{
        height: 40,
        backgroundColor: "#F9FAFB",
        borderColor: "#E5E7EB",
      }}
    >
      <img
        src={vanniLogo}
        alt="Vanni Logo"
        className="h-6 w-auto md:h-6 h-5"
      />
      <span
        className="text-[11px] md:text-[12px]"
        style={{ color: "#6B7280" }}
      >
        Developed by Vanni
      </span>
    </footer>
  );
};

export default DeveloperFooter;
