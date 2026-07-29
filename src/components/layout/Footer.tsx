import Link from "next/link";

export function Footer() {
  const footerLinks = [
    {
      title: "Shop",
      links: [
        { href: "/products", label: "All Products" },
        { href: "/categories", label: "Categories" },
        { href: "/products?featured=true", label: "Featured" },
      ],
    },
    {
      title: "Help",
      links: [
        { href: "/shipping", label: "Shipping" },
        { href: "/returns", label: "Returns" },
        { href: "/faq", label: "FAQ" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About Us" },
        { href: "/contact", label: "Contact" },
        { href: "/privacy", label: "Privacy" },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold text-white mb-4 block">
              GlobalShop
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Premium cross-border shopping with worldwide shipping.
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              © 2026 GlobalShop. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <span>ICP备案号: 京ICP备XXXXXXXX号</span>
              <span>跨境电商资质认证</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Cookie Policy
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Payment Methods:</span>
              <div className="flex gap-2">
                <div className="w-8 h-5 bg-slate-700 rounded"></div>
                <div className="w-8 h-5 bg-slate-700 rounded"></div>
                <div className="w-8 h-5 bg-slate-700 rounded"></div>
                <div className="w-8 h-5 bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
