import { UserRound } from "lucide-react";

import styles from "./estimate-request-identity.module.css";

export type EstimateIdentityLabels = {
  contact: string;
  contactHint: string;
  guestNameHint: string;
  identityLoading: string;
  nickname: string;
};

export type MemberEstimateIdentityProps = {
  contact: string;
  labels: EstimateIdentityLabels;
  loading: boolean;
  nickname: string;
};

export function MemberEstimateIdentity({
  contact,
  labels,
  loading,
  nickname,
}: MemberEstimateIdentityProps) {
  return (
    <div className={styles.memberIdentity}>
      <div>
        <UserRound aria-hidden="true" size={18} />
        <span>
          <small>{labels.nickname}</small>
          <strong>{loading ? labels.identityLoading : nickname}</strong>
        </span>
      </div>
      <div>
        <span aria-hidden="true" className={styles.discordMark}>◉</span>
        <span>
          <small>{labels.contact}</small>
          <strong>{loading ? labels.identityLoading : contact}</strong>
        </span>
      </div>
    </div>
  );
}

export type GuestEstimateIdentityProps = {
  contactKind?: string;
  contactValue?: string;
  disabled: boolean;
  displayName?: string;
  labels: EstimateIdentityLabels;
  onContactKindChange?(value: string): void;
  onContactValueChange?(value: string): void;
  onDisplayNameChange?(value: string): void;
};

export function GuestEstimateIdentity({ contactKind, contactValue, disabled, displayName, labels, onContactKindChange, onContactValueChange, onDisplayNameChange }: GuestEstimateIdentityProps) {
  return (
    <div className={styles.guestIdentity}>
      <label>
        {labels.nickname}<span>*</span>
        <input
          aria-label={labels.nickname}
          disabled={disabled}
          maxLength={80}
          name="guestDisplayName"
          onChange={onDisplayNameChange ? (event) => onDisplayNameChange(event.target.value) : undefined}
          placeholder={labels.guestNameHint}
          required
          type="text"
          value={displayName}
        />
      </label>
      <label>
        {labels.contact}<span>*</span>
        <div className={styles.contactFields}>
          <select
            aria-label={`${labels.contact} method`}
            defaultValue={contactKind === undefined ? "discord" : undefined}
            disabled={disabled}
            name="guestContactKind"
            onChange={onContactKindChange ? (event) => onContactKindChange(event.target.value) : undefined}
            value={contactKind}
          >
            <option value="discord">Discord</option>
            <option value="email">Email</option>
            <option value="facebook">Facebook</option>
            <option value="x">X</option>
          </select>
          <input
            aria-label={`${labels.contact} value`}
            disabled={disabled}
            maxLength={200}
            name="guestContactValue"
            onChange={onContactValueChange ? (event) => onContactValueChange(event.target.value) : undefined}
            placeholder={labels.contactHint}
            required
            type="text"
            value={contactValue}
          />
        </div>
      </label>
    </div>
  );
}
