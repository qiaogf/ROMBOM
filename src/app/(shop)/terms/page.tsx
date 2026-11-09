export default function TermsPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-6 py-10 text-left">
        <h2 className="text-[15px] font-bold text-slate-900 mb-6">
          Terms | Privacy | Shipping | Returns &amp; Refunds
        </h2>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">1. Definitions</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li><span className="font-semibold text-slate-900">We / Us / Our:</span> MROBOM.</li>
            <li><span className="font-semibold text-slate-900">You / Customer:</span> a business, institution or commercial buyer submitting enquiries or placing orders.</li>
            <li><span className="font-semibold text-slate-900">Products:</span> goods quoted, confirmed and supplied through this site.</li>
            <li><span className="font-semibold text-slate-900">Production-BOM:</span> the customer-supplied bill of materials, including revisions.</li>
            <li><span className="font-semibold text-slate-900">Order Confirmation:</span> the written document we issue, including a Proforma Invoice.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">2. Acceptance of Terms</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
            These Terms govern all visits, enquiries, quotations, orders, payments, deliveries and after-sales service. By using this site you accept them; if you do not, please stop using it. Separate written agreements or special terms stated in an Order Confirmation prevail for the matters they cover. We may verify customer identity and end use for sanctions, export-control and anti-money-laundering compliance, and may decline a transaction if verification fails. Contact: info@mrobom.com.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">3. Website &amp; Account Use</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>The site is for business and commercial buyers only. You confirm that you are at least 18 and authorised to bind your organisation.</li>
            <li>Provide true and accurate registration, billing and shipping data; you bear costs caused by incorrect data, such as customs clearance failure or an invalid invoice.</li>
            <li>Prohibited: scraping, reverse engineering, penetration testing, uploading malicious code, fake-identity registration and account sharing.</li>
            <li>We do not guarantee uninterrupted availability; maintenance or third-party outages are not a breach. You are responsible for your account credentials, and we may suspend accounts showing abnormal login activity.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">4. Quotations &amp; Production-BOM</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Prices, stock and lead times shown on the site are indicative and not an offer. Binding terms exist only in our written quotation and Order Confirmation.</li>
            <li>Quotations are valid for 7 working days unless stated otherwise; afterwards we may re-quote at updated cost and exchange rates.</li>
            <li>For Production-BOM orders we price line by line and flag missing items, long-lead items, MOQ limits, alternative-only items and non-cancellable / non-returnable items.</li>
            <li>You are responsible for BOM completeness, accuracy and version control; any revision invalidates the original quotation. Errors in your BOM data are borne by you; we may correct material calculation errors, and you may accept the revised terms or cancel for a full refund of prepaid funds.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">5. Orders, Rejection &amp; Cancellation</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>A contract exists only when we issue an Order Confirmation / Proforma Invoice and receive the agreed advance payment. A customer order alone creates no obligation.</li>
            <li>We may reject or cancel for stock shortage, material quotation error, unmet MOQ, failed identity or end-use verification, sanctions risk or credit concerns; prepayments are refunded.</li>
            <li>You may cancel free of charge before Order Confirmation. After confirmation, cancellation requires our written consent and you bear procurement, processing, freight and penalty costs. Non-cancellable / non-returnable items cannot be cancelled.</li>
            <li>A quantity tolerance of ±5% per shipment applies to industrial goods; settlement is based on the actual shipped quantity. Written partial shipments are treated as independent deliveries.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">6. Products, Part Numbers &amp; Substitute Parts</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Specifications, datasheets and images reference manufacturer documentation; official manufacturer datasheets prevail over site descriptions.</li>
            <li>MROBOM is not the manufacturer of most listed goods. Brand names, trademarks and part numbers identify compatibility only and belong to their respective owners; we are not an authorised reseller unless explicitly stated.</li>
            <li>Alternative, equivalent or refurbished parts are supplied only with your written acceptance and are marked on the quotation with source and key parameter differences. You are responsible for confirming part suitability; our identification assistance is not a fitness-for-purpose warranty.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">7. Pricing, Currency, Taxes &amp; Incoterms</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Quotations default to USD unless another currency is stated; payment currency matches the quotation currency.</li>
            <li>Unit prices exclude freight, insurance, export fees, import duties, VAT, customs brokerage, inspection and demurrage unless included in the quotation.</li>
            <li>Risk and cost allocation follows Incoterms 2020 as stated in the quotation (EXW / FOB / CIF / DAP). Import duties and taxes are for the buyer&apos;s account. We will not falsify values or commodity descriptions to reduce import tax.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">8. Payment &amp; Settlement</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Accepted methods: bank transfer to our official invoice account and card payment via a licensed third-party gateway. Cash and cheques are not accepted. Card data is processed by encrypted providers; we do not store full card numbers or CVV codes. Third-party payers require prior written notice and our approval.</li>
            <li>Unless otherwise agreed, full payment is due before shipment; custom-modified items may require a deposit of at least 30%. Bank charges, intermediary deductions and exchange-rate losses are borne by you. Short payment delays shipment, and overdue payment allows us to suspend shipments and other open orders.</li>
            <li>Refunds are made to the original payment method and currency; bank and exchange losses are non-refundable. Payments are screened for anti-money-laundering and sanctions compliance, and supporting documents may be requested.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">9. Delivery &amp; Documentation</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Lead time runs from Order Confirmation plus receipt of the agreed deposit, counted in working days. In-stock items usually ship within 3-7 working days; sourced items typically take 2-6 weeks as quoted.</li>
            <li>Modes: international courier, air freight or sea freight. Freight is charged on the greater of gross or volumetric weight, plus remote-area and fuel surcharges.</li>
            <li>Partial shipment is permitted with your consent, each with separate insurance, documents and settlement. Standard documents: commercial invoice and packing list. Certificates of origin, test reports and batch records depend on upstream supplier availability and must be requested at the enquiry stage.</li>
            <li>Risk passes on hand-over to the carrier. Inspect quantity and outer packaging on receipt and report damage to the carrier on site. We are not liable for carrier disruption, port congestion, customs inspection or force majeure. Costs from late clearance, non-collection or an incorrect delivery address are yours.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">10. Inspection, Claims, RMA &amp; Returns</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Visible damage, shortage or wrong-item claims: within 3 working days of receipt.</li>
            <li>Hidden functional or specification non-conformity: within 7 calendar days of receipt.</li>
            <li>Manufacturer warranty defects follow the applicable warranty period.</li>
            <li>Claims must state invoice number, part number, quantity, problem description, photos and packing list. Late claims deem visible quantity and appearance items accepted, without prejudice to hidden-defect rights.</li>
            <li>All returns require our written RMA number; unauthorised returns are rejected. Accepted: our wrong part or quantity, transit damage reported in time, goods not matching the confirmed order.</li>
            <li>Not accepted: correctly supplied standard parts; customer-caused reasons such as project cancellation or ordering error; complete BOM kits; custom-cut, modified or special-procurement goods; non-cancellable / non-returnable items; used or opened consumables; goods without original sellable packaging; expired claims.</li>
            <li>For our-fault returns, return freight is on us. For customer-initiated returns accepted as a courtesy, you cover both-way freight; replacement or re-shipment is preferred; refunds are completed within 5-10 working days after inspection, and a restocking fee of up to 20% of invoice value may apply.</li>
            <li>Quality disputes may be referred to a mutually agreed third-party laboratory, with the cost borne by the responsible party.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">11. Warranty</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>We pass through the original manufacturer warranty; scope and term follow the manufacturer specification stated on the quotation. No additional independent warranty is given.</li>
            <li>No implied warranty of merchantability or fitness for a specific purpose applies. The warranty excludes damage from over-rating, improper installation, unauthorised modification, normal wear and tear, corrosion or external mechanical impact.</li>
            <li>The remedy is limited to replacement, repair or partial / full refund of the defective item at our option, subject to the liability cap below.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">12. Confidentiality &amp; Intellectual Property</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>Your BOM documents, drawings, technical requirements and project information are treated as confidential and used only for quotation and order fulfilment. We will not publish them or use them as marketing samples without consent. Confidentiality lasts 5 years from receipt, or longer if required by law.</li>
            <li>Our site text, layout, original images, data compilation and the MROBOM brand are protected intellectual property. You may download product documents for internal procurement use only. Systematic scraping, mass copying, reproduction or dataset building without written permission is prohibited.</li>
            <li>Third-party trademarks are shown for identification only and imply no agency or partnership. IP infringement notices may be sent to info@mrobom.com.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">13. Privacy &amp; Cookies</h2>
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
            <li>We collect business contact data, order records, BOM files, transaction metadata and access logs for contract performance, fraud prevention, tax and export archiving, and service improvement. We do not sell personal data.</li>
            <li>Necessary cookies enable basic site function; analytics and marketing cookies activate only with your consent. Processors include payment providers, freight forwarders, cloud hosting and accounting consultants. Data may be processed in China, Singapore, the EU and the USA under lawful cross-border transfer safeguards.</li>
            <li>Retention: order documents 7 years; unprocessed enquiries 24 months; access logs 12 months. You may exercise data-subject rights by emailing info@mrobom.com; we respond within 30 calendar days. This site is not intended for minors.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">14. Export Control &amp; Sanctions</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            You are responsible for local import permits and for the end use and end user of purchased goods. You agree not to re-export or divert goods to sanctioned jurisdictions or entities, or to prohibited military or WMD-related applications. We may request end-use statements and may suspend or cancel orders if they are refused. We incur no liability for non-performance compelled by applicable sanctions or export-control law.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">15. Limitation of Liability</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Our total aggregate liability for any single claim shall not exceed the invoiced value of the goods giving rise to it. We are not liable for indirect, consequential, special or punitive damages, including lost profit, production downtime, loss of goodwill or third-party indemnity claims. Mandatory statutory exceptions such as wilful misconduct, gross negligence or personal injury are unaffected. Claims must be filed within 12 months of delivery unless a longer statutory period applies. You shall take reasonable steps to mitigate loss after discovering damage.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">16. Force Majeure</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Force majeure includes natural disaster, war, strike, government regulatory action, export-control measures, port closure and upstream supplier shutdown. Cost increases, exchange-rate movements and purely commercial risks are not force majeure. The affected party shall give prompt written notice. If force majeure persists beyond 60 consecutive days, either party may terminate the affected part of the contract; completed performance is settled accordingly with no further liability on either side.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">17. Suspension &amp; Termination</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            We may suspend performance for overdue payment, failed verification, sanctions risk or unresolved material quality disputes, and may terminate for material breach without remedy, insolvency, bankruptcy or sanctions-list inclusion. Termination does not extinguish payment obligations for goods already shipped. Set-off of mutual receivables and payables is permitted.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">18. Governing Law &amp; Dispute Resolution</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            These Terms and related sales contracts are governed by the laws of the People&apos;s Republic of China. Disputes first go through 30 days of amicable negotiation after written notice; if unresolved, the competent courts in China have exclusive jurisdiction. The UN Convention on Contracts for the International Sale of Goods (CISG) is excluded. Where multiple language versions exist, the English version prevails.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-slate-900 mb-3">19. Amendment &amp; Severability</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            We may revise these Terms by publishing an updated version with an effective date; revisions do not affect orders confirmed before that date. If a clause is held invalid or unenforceable, the remaining clauses stay in full force. These Terms, together with the quotation, proforma invoice, order confirmation and packing list, form the entire agreement and supersede prior oral or written arrangements. You may not assign contractual rights without our written consent; we may assign this agreement in a merger, acquisition or business transfer with prior notice. Notice sent to the registered contact email counts as valid delivery. Failure to enforce any provision does not waive that right.
          </p>
        </section>
      </div>
    </div>
  );
}
