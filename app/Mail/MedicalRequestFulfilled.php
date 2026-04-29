<?php

namespace App\Mail;

use App\Models\MedicalRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MedicalRequestFulfilled extends Mailable
{
    use Queueable, SerializesModels;

    public $medicalRequest;

    /**
     * Create a new message instance.
     */
    public function __construct(MedicalRequest $medicalRequest)
    {
        $this->medicalRequest = $medicalRequest;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Medical Request Fulfilled',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.medical-request-fulfilled',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
