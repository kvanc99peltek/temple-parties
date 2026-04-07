'use client';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="bg-black pt-10 pb-4">
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-[36px] leading-[27px] font-normal text-white font-bitcount">
          {title ?? <>Temple<br />Parties</>}
        </h1>
      </div>
    </header>
  );
}
