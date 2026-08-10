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
  disabled: boolean;
  labels: EstimateIdentityLabels;
};

export function GuestEstimateIdentity({ disabled, labels }: GuestEstimateIdentityProps) {
  return (
    <div className={styles.guestIdentity}>
      <label>
        {labels.nickname}<span>*</span>
        <input
          aria-label={labels.nickname}
          disabled={disabled}
          maxLength={80}
          name="guestDisplayName"
          placeholder={labels.guestNameHint}
          required
          type="text"
        />
      </label>
      <label>
        {labels.contact}<span>*</span>
        <div className={styles.contactFields}>
          <select
            aria-label={`${labels.contact} method`}
            defaultValue="discord"
            disabled={disabled}
            name="guestContactKind"
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
            placeholder={labels.contactHint}
            required
            type="text"
          />
        </div>
      </label>
    </div>
  );
}
