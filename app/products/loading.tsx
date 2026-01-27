import Header from "@/app/common/Header";
import Footer from "@/app/common/Footer";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <div className="mx-auto w-full max-w-[1270px] px-4 sm:px-6">
          <h1 className="text-2xl font-bold mb-6 text-primary italic">All Products</h1>
          <ProductGrid loading={true} />
        </div>
      </main>
      <Footer />
    </div>
  );    
}
