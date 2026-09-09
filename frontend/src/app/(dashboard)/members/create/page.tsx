'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Save,
  GraduationCap,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { membersService } from '../../../../services/members.service';
import { MembershipType } from '../../../../types/financial';

export default function CreateMemberPage() {
  const router = useRouter();
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    email: '',
    phone: '',
    department: 'Software Engineering',
    batch: '',
    semester: '',
    membership_type_id: '',
    joined_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    membersService
      .getMembershipTypes()
      .then((types) => {
        setMembershipTypes(types || []);
        if (types && types.length > 0) {
          const general = types.find((t) => t.name === 'GENERAL_MEMBER') || types[0];
          setFormData((prev) => ({ ...prev, membership_type_id: general.id }));
        }
      })
      .catch((err) => console.error('Failed to load membership types', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedTier = membershipTypes.find((t) => t.id === formData.membership_type_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const created = await membersService.createMember({
        ...formData,
        membership_type_id: formData.membership_type_id || undefined,
      });

      setSuccess(`Member registered successfully with code ${created.member_code}!`);
      setTimeout(() => {
        router.push(`/members/${created.id}`);
      }, 1200);
    } catch (err: any) {
      let msg = err.response?.data?.error?.message;
      if (!msg && err.response?.data?.error?.details?.fieldErrors) {
        const errors = Object.entries(err.response.data.error.details.fieldErrors)
          .map(([field, errs]: any) => `${field.replace(/_/g, ' ')}: ${errs.join(', ')}`)
          .join(' | ');
        msg = errors;
      }
      setError(msg || err.message || 'Failed to register member');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              Register Club Member
            </h1>
            <p className="text-sm text-slate-400">
              Create a club member profile, assign membership tier, and generate joining fee obligations
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-6">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            Academic & Identification Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                DIU Student ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="student_id"
                required
                placeholder="e.g. 221-15-1234"
                value={formData.student_id}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                required
                placeholder="e.g. Mohammad Tanvir Ahmed"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="e.g. tanvir.swe@diu.edu.bd"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
              <input
                type="text"
                name="phone"
                placeholder="e.g. 01711223344"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Business Administration">Business Administration</option>
                <option value="Finance & Banking">Finance & Banking</option>
                <option value="Accounting & Information Systems">Accounting & Information Systems</option>
                <option value="Economics">Economics</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Batch</label>
                <input
                  type="text"
                  name="batch"
                  placeholder="e.g. 58th"
                  value={formData.batch}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Semester</label>
                <input
                  type="text"
                  name="semester"
                  placeholder="e.g. 7th"
                  value={formData.semester}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Membership Tier & Policy */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-5">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Membership Tier & Joining Assessment
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Membership Tier <span className="text-rose-400">*</span>
              </label>
              <select
                name="membership_type_id"
                value={formData.membership_type_id}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                {membershipTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name.replace(/_/g, ' ')} (Joining: ৳{t.joining_fee}, Renewal: ৳{t.renewal_fee})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Joined Date</label>
              <input
                type="date"
                name="joined_date"
                value={formData.joined_date}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {selectedTier && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-slate-400">Selected Tier:</span>
                <span className="text-white font-semibold">{selectedTier.name.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Joining Fee Obligation:</span>
                <span className="text-emerald-400 font-bold">৳{selectedTier.joining_fee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Billing Cycle:</span>
                <span className="text-slate-300">{selectedTier.billing_cycle}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                * An initial joining due obligation of ৳{selectedTier.joining_fee} will be generated automatically in PENDING status. Once verified, the member will automatically activate.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Notes / Interests</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Investment interests, skills, or remarks..."
              value={formData.notes}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/members"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/40"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Registering...' : 'Register Member'}
          </button>
        </div>
      </form>
    </div>
  );
}
