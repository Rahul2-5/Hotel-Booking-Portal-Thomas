export default function BookingSteps({ current }) {
  const steps = ['Dates', 'Your details', 'Review', 'Confirmed'];
  return <ol className="booking-steps" aria-label="Booking progress">
    {steps.map((step, index) => <li key={step} aria-current={index === current ? 'step' : undefined} className={index < current ? 'complete' : ''}>
      <span aria-hidden="true">{index + 1}</span>{step}
    </li>)}
  </ol>;
}
