'use client';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="bg-black pt-10 pb-4 lg:hidden">
      <div className="max-w-xl lg:max-w-3xl mx-auto px-6 lg:px-8">
        <h1 className="text-[36px] leading-[27px] lg:text-[44px] lg:leading-[34px] font-normal text-white font-bitcount">
          {title ?? <>Temple<br />Parties</>}
        </h1>
      </div>
    </header>
  );
}
