import React from 'react';
import { Trophy } from 'lucide-react';
import balaSignature from '../../bala_signature.png';
import uvarajSignature from '../../uvaraj_signature.png';

const PromotionPage = ({ data }) => {
  const { 
    employeeName, 
    employeeId,
    designation,
    promotion,
    location,
    date,
    effectiveDate: letterEffectiveDate // from data level
  } = data;

  const newDesignation = promotion?.newDesignation || '';
  const effectiveDate = promotion?.effectiveDate || letterEffectiveDate || '';

  // Signature selection logic matching other pages
  const isHosur = location && location.toLowerCase().includes('hosur');
  const isChennai = location && location.toLowerCase().includes('chennai');
  const signature = isHosur ? balaSignature : (isChennai ? uvarajSignature : null);

  return (
    <div id="release-letter-page-3" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col page-break-before overflow-hidden">
      {/* Header - Matching existing pages EXACTLY */}
      <div className="w-full flex h-32 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 z-0">
          <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
            <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
            <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
          </svg>
        </div>

        <div className="relative w-[60%] flex items-center pl-8 pr-12 z-10">
          <div className="flex items-center gap-4">
            <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
            <div className="text-white">
              <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
              <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
          <div className="flex items-center mb-2">
            <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
            <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
          </div>
          <div className="flex items-start justify-end text-right">
            <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
            <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="px-12 py-10 flex-grow">
        <div className="flex justify-between mb-8">
          <div />
          <div className="text-gray-700">Date: <span className="font-bold">{date}</span></div>
        </div>

        <div className="mt-8 mb-16 text-center flex flex-col items-center w-full">
          <div className="bg-[#1e2b58] p-5 rounded-2xl mb-6 shadow-xl border-4 border-orange-400/30">
             <Trophy className="h-12 w-12 text-yellow-400" />
          </div>
          <div className="font-black text-3xl underline decoration-2 underline-offset-[16px] uppercase tracking-[0.25em] text-[#1e2b58] leading-relaxed">
            Certificate of Promotion
          </div>
        </div>

        <div className="mb-10 text-justify text-[15px] leading-8 text-gray-800">
          <div className="mb-6 text-lg tracking-tight">Dear <span className="font-bold text-gray-900">{employeeName}</span>,</div>
          <p className="mb-6">
            You have been promoted as <span className="font-black text-[#1e2b58] bg-blue-50 px-1 rounded">"{newDesignation}"</span> in recognition of your consistent performance, dedication, and valuable contributions to the organization.
          </p>
          <p className="mb-6">
            The promotion will be effective from <span className="font-bold text-[#1e2b58]">{effectiveDate}</span>.
          </p>
          <p className="mt-8 font-medium">
            We congratulate you on this achievement and wish you continued success in your new role.
          </p>
        </div>

        <div className="mt-16 flex justify-end">
          <div className="text-right relative">
            <div className="mb-2 text-sm text-gray-700 font-medium">For CALDIM ENGINEERING PRIVATE LIMITED</div>
            <div className="mt-10 flex flex-col items-end min-h-[100px]">
              {signature ? (
                <img src={signature} alt="Authorized Signatory" className="h-20 mb-2 object-contain" crossOrigin="anonymous" />
              ) : (
                <div className="h-20 mb-2"></div>
              )}
              <div className="font-black text-gray-900">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Matching existing pages */}
      <div className="w-full h-24 relative mt-auto overflow-hidden shrink-0">
        <div className="absolute inset-0 z-0">
          <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
            <rect x="0" y="84" width="350" height="12" fill="#f37021" />
            <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
          </svg>
        </div>
        <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
          <div className="text-white text-right">
            <div className="text-sm font-medium tracking-wide font-sans">Website : www.caldimengg.com</div>
            <div className="text-sm font-medium tracking-wide mt-1 font-sans">CIN U74999TN2016PTC110683</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionPage;
