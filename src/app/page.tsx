import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardImage } from "@/components/ui/Card";
import { ArrowRight, Star, Truck, Shield, RefreshCw } from "lucide-react";

const featuredProducts = [
  {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    price: 199.99,
    originalPrice: 249.99,
    image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20wireless%20bluetooth%20headphones%20white%20background%20product%20photography&image_size=square",
    rating: 4.8,
    reviews: 1256,
    currency: "USD",
  },
  {
    id: 2,
    name: "Smart Watch Pro",
    price: 299.99,
    originalPrice: 399.99,
    image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20smart%20watch%20white%20background%20product%20photography&image_size=square",
    rating: 4.6,
    reviews: 892,
    currency: "USD",
  },
  {
    id: 3,
    name: "Portable Power Bank",
    price: 79.99,
    originalPrice: 99.99,
    image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=slim%20portable%20power%20bank%20white%20background%20product%20photography&image_size=square",
    rating: 4.9,
    reviews: 2103,
    currency: "USD",
  },
  {
    id: 4,
    name: "Premium Skincare Set",
    price: 129.99,
    originalPrice: 179.99,
    image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=luxury%20skincare%20set%20white%20background%20product%20photography&image_size=square",
    rating: 4.7,
    reviews: 678,
    currency: "USD",
  },
];

const features = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On orders over $100 worldwide",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "SSL encrypted transactions",
  },
  {
    icon: RefreshCw,
    title: "30 Day Returns",
    description: "Hassle-free return policy",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="relative bg-gradient-to-br from-primary to-primary-light text-white py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Shop Global,
              <br />
              <span className="text-accent">Deliver Local</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-xl">
              Discover premium products from around the world. Fast shipping, secure payments, and exceptional customer service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg">
                Shop Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                Explore Categories
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-foreground-secondary">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Products</h2>
            <p className="text-foreground-secondary mt-2">Top rated products from our collection</p>
          </div>
          <Link href="/products" className="hidden sm:flex items-center gap-2 text-accent hover:text-accent-hover font-medium transition-colors">
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Card key={product.id} hoverable className="group">
              <CardImage src={product.image} alt={product.name} className="group-hover:scale-105 transition-transform duration-300" />
              <CardContent className="space-y-3">
                <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span className="text-sm font-medium text-foreground">{product.rating}</span>
                  <span className="text-sm text-foreground-muted">({product.reviews})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-accent">{product.currency} {product.price}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-foreground-muted line-through">
                      {product.currency} {product.originalPrice}
                    </span>
                  )}
                </div>
                <Button className="w-full">Add to Cart</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="sm:hidden mt-8 text-center">
          <Button variant="outline" size="lg">
            View All Products
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      <section className="bg-accent text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">Subscribe to Our Newsletter</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            Get exclusive offers, new arrivals, and shopping tips delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <Button className="bg-white text-accent hover:bg-gray-100">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
