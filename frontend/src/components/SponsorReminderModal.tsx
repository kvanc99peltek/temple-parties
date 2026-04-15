// 'use client';
//
// import ModalWrapper from './ModalWrapper';
//
// interface SponsorReminderModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   sponsorName: string;
//   onNavigate: () => void;
// }
//
// export default function SponsorReminderModal({
//   isOpen,
//   onClose,
//   sponsorName,
//   onNavigate,
// }: SponsorReminderModalProps) {
//   const handleNavigate = () => {
//     onNavigate();
//     onClose();
//   };
//
//   return (
//     <ModalWrapper
//       isOpen={isOpen}
//       onClose={onClose}
//       className="!border-[#b24bf3]/30 !shadow-[#b24bf3]/30 !p-0 overflow-hidden !max-w-[300px]"
//     >
//       <div className="text-center px-8 pt-8 pb-2">
//         <h3 className="text-xl font-bold text-white font-montserrat">
//           Are you starving?<br />Grab food at<br /><span className="text-[#b24bf3]">{sponsorName}</span>
//         </h3>
//       </div>
//
//       <p className="text-white/40 text-xs font-helvetica text-center pb-4">
//         ~ 5 minute walk
//       </p>
//
//       <button
//         onClick={handleNavigate}
//         className="w-full h-[49px] rounded-bl-2xl rounded-br-2xl flex items-center justify-center bg-[#e0d4ff] text-white hover:opacity-90 active:scale-[0.98] transition-all duration-150"
//       >
//         <img src="/icons/navigate.svg" alt="Navigate" className="w-6 h-6" />
//       </button>
//     </ModalWrapper>
//   );
// }
