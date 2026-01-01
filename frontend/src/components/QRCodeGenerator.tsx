import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Product } from '../types';

interface QRCodeGeneratorProps {
  products: Product[];
}

export default function QRCodeGenerator({ products }: QRCodeGeneratorProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qrValue, setQrValue] = useState<string>('');

  const generateProductQR = (product: Product) => {
    const data = {
      type: 'product',
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    };
    return JSON.stringify(data);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setQrValue(generateProductQR(product));
  };

  const handleCustomQR = () => {
    setSelectedProduct(null);
    setQrValue('');
  };

  const downloadQR = () => {
    const svg = document.querySelector('#qrcode-container svg') as SVGElement;
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = selectedProduct 
          ? `qrcode-${selectedProduct.name.replace(/\s+/g, '-')}.png`
          : 'qrcode.png';
        link.href = url;
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">QR Code Generator</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Product</h3>
          <div className="space-y-2 mb-4">
            <button
              onClick={handleCustomQR}
              className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                !selectedProduct
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Custom QR Code
            </button>
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                  selectedProduct?.id === product.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">{product.name}</div>
                <div className="text-xs text-slate-500">
                  {product.quantity} in stock • ${product.price}
                </div>
              </button>
            ))}
          </div>

          {!selectedProduct && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Custom QR Code Value
              </label>
              <textarea
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                placeholder="Enter text or URL for QR code..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {selectedProduct && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Product Information</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Name:</strong> {selectedProduct.name}</p>
                <p><strong>Price:</strong> ${selectedProduct.price}</p>
                <p><strong>Stock:</strong> {selectedProduct.quantity} units</p>
                {selectedProduct.category && (
                  <p><strong>Category:</strong> {selectedProduct.category}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">QR Code</h3>
          {qrValue ? (
            <div id="qrcode-container" className="bg-white p-4 rounded-lg border border-slate-200">
              <QRCodeSVG
                value={qrValue}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          ) : (
            <div className="w-64 h-64 bg-slate-100 rounded-lg flex items-center justify-center">
              <p className="text-slate-400">Select a product or enter custom text</p>
            </div>
          )}
          
          {qrValue && (
            <button
              onClick={downloadQR}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download QR Code
            </button>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">How to Use QR Codes</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Generate QR codes for products to enable quick scanning</li>
          <li>Use custom QR codes for URLs, contact info, or any text</li>
          <li>Download and print QR codes for physical inventory management</li>
          <li>Scan with any QR code reader app on your phone</li>
        </ul>
      </div>
    </div>
  );
}

