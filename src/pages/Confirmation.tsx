import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function Confirmation() {
  return (
    <div className="pt-32 pb-24 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="bg-brand-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <CheckCircle className="w-12 h-12 text-brand-600" />
        </motion.div>
        
        <h1 className="text-4xl font-display font-bold mb-6">Assessment Requested!</h1>
        <p className="text-xl text-slate-600 mb-12">
          Thank you for your interest. We've received your details and <strong>we will contact you shortly</strong> to schedule our call.
        </p>
        
        <Link to="/" className="inline-flex items-center text-brand-600 font-bold hover:underline">
          Return to Home
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
