import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';

export interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember?: (data: { name: string; email: string; plan: string }) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = React.memo(({
  isOpen,
  onClose,
  onAddMember,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('Gold Pro Plan');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    if (onAddMember) onAddMember({ name, email, plan });
    onClose();
    setName('');
    setEmail('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Gym Member" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 select-none">
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marcus Vance"
          required
        />
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. marcus@example.com"
          required
        />
        <Select
          label="Membership Tier"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          options={[
            { value: 'Standard Pass', label: 'Standard Pass ($79/mo)' },
            { value: 'Gold Pro Plan', label: 'Gold Pro Plan ($125/mo)' },
            { value: 'VIP Unlimited', label: 'VIP Unlimited + PT ($249/mo)' },
          ]}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="md" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit">
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
});

AddMemberModal.displayName = 'AddMemberModal';
